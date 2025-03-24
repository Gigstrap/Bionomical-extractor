import { Injectable, Logger } from '@nestjs/common';
import { Groq } from 'groq-sdk';
import { ArangoService } from '../db/arango.service';
import { prompts } from './prompts';
import Anthropic from '@anthropic-ai/sdk';

@Injectable()
export class AiService {
    private readonly logger = new Logger(AiService.name);
    private readonly groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

    constructor(private readonly arangoService: ArangoService) { }

    async generateColumnDescriptions(collectionName: string, company: string) {
        try {
            const descCollectionName = `${collectionName.replace('_csv_', '_description_')}`;

            // Retrieve column names from the specific CSV collection.
            const columnNames = await this.arangoService.getCollectionColumnNames(collectionName);
            if (!columnNames.length) {
                throw new Error('No columns found for the given CSV collection name.');
            }

            // Filter out unwanted fields
            const filteredColumnNames = columnNames.filter(col => !['_rev', '_key', '_id'].includes(col));

            // Get sample data for each field and build prompt parts
            const columnSamples = await Promise.all(
                filteredColumnNames.map(async (col) => {
                    const samples = await this.arangoService.getColumnSampleData(collectionName, col, 100);
                    return { field: col, samples };
                })
            );

            const promptParts = columnSamples.map(item => {
                return `Field name: ${item.field}\nSamples: ${item.samples.join(', ')}`;
            });

            // Fetch AI-generated descriptions (without dataType info)
            const aiResponse = await this.fetchResponse(prompts.GENERATE_COLUMN_DESCRIPTIONS(collectionName, descCollectionName, company, promptParts));
            this.logger.log('AI Response:', aiResponse);

            // Ensure the response is a valid JSON array
            let aiDescriptions: { field: string; description: string }[];
            try {
                aiDescriptions = JSON.parse(aiResponse);
                if (!Array.isArray(aiDescriptions)) {
                    throw new Error('AI response is not a valid JSON array.');
                }
            } catch (error) {
                this.logger.error('Failed to parse AI response:', aiResponse);
                throw new Error('AI response is not in valid JSON format.');
            }

            // Merge the AI-generated description with the exact data type determined from stored samples.
            const descriptionsWithDataTypes = aiDescriptions.map(desc => {
                const sampleData = columnSamples.find(item => item.field === desc.field)?.samples || [];
                const dataType = this.detectExactDataType(sampleData);
                return { ...desc, dataType };
            });

            await this.arangoService.storeAIDescription(descCollectionName, company, descriptionsWithDataTypes);

            return { collectionName, descriptions: descriptionsWithDataTypes };
        } catch (error) {
            this.logger.error('Error generating AI description:', error);
            throw new Error('Failed to generate column descriptions.');
        }
    }

    async processUserQuery(userQuery: string, collectionName: string, datasetContext?: string) {
        try {
            if (!collectionName) {
                throw new Error('Collection name must be provided.');
            }

            // Fetch some sample documents from the collection to understand its structure
            const sampleDocs = await this.arangoService.getSampleDocuments(collectionName, 20);
            if (!sampleDocs.length) {
                throw new Error(`No sample documents found in collection: ${collectionName}`);
            }

            // Derive description collection name (assumes CSV collections follow a naming pattern)
            const descriptionCollectionName = collectionName.replace('_csv_', '_description_');
            // Fetch stored descriptions from ArangoDB.
            const storedDescriptions = await this.arangoService.getAIDescription(descriptionCollectionName);

            // Get AI-generated AQL query including schema descriptions and dataset context as additional context.
            const aiResponse = await this.fetchResponse(
                prompts.GENERATE_AQL_QUERY(collectionName, sampleDocs, userQuery, storedDescriptions, datasetContext || '')
            );
            this.logger.log('AI Response:', aiResponse);

            let queryData: { collection: string; aql_query: string; explanation: string };
            try {
                queryData = JSON.parse(aiResponse);
                if (!queryData.collection || !queryData.aql_query || !queryData.explanation) {
                    throw new Error('Invalid AI response format.');
                }
            } catch (error) {
                this.logger.error('Failed to parse AI response:', aiResponse);
                throw new Error('AI response is not in valid JSON format.');
            }

            const collectionRegex = /(\bFOR\s+\w+\s+IN\s+)(`?)([^\s`]+)(`?)/i;
            queryData.aql_query = queryData.aql_query.replace(collectionRegex, (match, prefix, openTick, colName, closeTick) => {
                if (openTick !== '`' || closeTick !== '`') {
                    return `${prefix}\`${colName}\``;
                }
                return match;
            });

            let queryResult: any;
            try {
                queryResult = await this.arangoService.executeAqlQuery(queryData.aql_query);
            } catch (error) {
                this.logger.error('Error executing the generated AQL query:', error);
                return {
                    collection: queryData.collection,
                    aql_query: queryData.aql_query,
                    explanation: queryData.explanation,
                    error: 'The generated AQL query failed to execute. Please refine your prompt or try again.'
                };
            }

            return {
                collection: queryData.collection,
                aql_query: queryData.aql_query,
                explanation: queryData.explanation,
                result: queryResult,
            };
        } catch (error) {
            this.logger.error('Error processing AI query:', error);
            throw new Error('Failed to process AI query.');
        }
    }

    private async fetchResponse(prompt: string): Promise<string> {
        try {
            const anthropic = new Anthropic({
                apiKey: process.env.ANTHROPIC_API_KEY,
            });

            const response = await anthropic.messages.create({
                model: "claude-3-7-sonnet-20250219",
                max_tokens: 1024,
                messages: [{ role: "user", content: prompt }],
            });

            // Handle the response content correctly by checking type
            let rawResponse = 'No response available';
            if (response.content && response.content.length > 0) {
                const firstContent = response.content[0];
                // Check if it's a text block
                if (firstContent.type === 'text') {
                    rawResponse = firstContent.text;
                }
            }

            this.logger.log('Raw AI Response from Anthropic:', rawResponse);
            return rawResponse;
        } catch (error) {
            this.logger.error(`Anthropic API error: ${error instanceof Error ? error.message : String(error)}`);
            throw new Error(`Failed to fetch AI response: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    async determineColumnTypes(data: any[]): Promise<{ [field: string]: string }> {
        if (data.length === 0) {
            throw new Error('No data provided for type detection');
        }

        // Use up to 100 rows as a sample to save AI tokens
        const sampleSize = Math.min(100, data.length);
        const sampleData = data.slice(0, sampleSize);
        const columnNames = Object.keys(sampleData[0]);

        // Build prompt for AI
        const promptParts = columnNames.map(col => {
            const samples = sampleData
                .map(row => row[col])
                .filter(val => val !== null && val !== undefined);
            return `Field name: ${col}\nSamples: ${samples.join(', ')}`;
        });

        const fullPrompt = `${prompts.IDENTIFY_DATA_TYPES}\n${promptParts.join('\n')}`;
        const aiResponse = await this.fetchResponse(fullPrompt);

        // Parse AI response
        let types: { field: string; type: string }[];
        try {
            types = JSON.parse(aiResponse);
            if (!Array.isArray(types)) {
                throw new Error('AI response is not an array');
            }
        } catch (error) {
            this.logger.error('Failed to parse AI response for type detection:', aiResponse);
            throw new Error('Invalid AI response for type detection');
        }

        // Convert to a map and normalize type names
        const typeMap = {};
        types.forEach(item => {
            if (item.field && item.type) {
                typeMap[item.field] = item.type.toLowerCase();
            }
        });

        return typeMap;
    }

    /**
     * @param values - An array of sample values for a specific field.
     * @returns A string representing the data type.
     */
    private detectExactDataType(values: any[]): string {
        if (!values || values.length === 0) return 'unknown';

        // Filter out null or undefined values.
        const validValues = values.filter(value => value !== null && value !== undefined);
        if (validValues.length === 0) return 'unknown';

        const detectedTypes = validValues.map(value => {
            if (typeof value === 'number') {
                // Even if it's an integer, we'll handle it as a float for numeric consistency.
                return Number.isInteger(value) ? 'integer' : 'float';
            }
            if (typeof value === 'boolean') {
                return 'boolean';
            }
            if (value instanceof Date && !isNaN(value.getTime())) {
                return 'date';
            }
            if (typeof value === 'string') {
                // Try to parse the string as a date.
                const parsed = new Date(value);
                if (!isNaN(parsed.getTime())) {
                    return 'date';
                }
                return 'string';
            }
            // Fallback to the default typeof result.
            return typeof value;
        });

        // If every detected type is numeric (either 'integer' or 'float'), return 'float'
        const allNumeric = detectedTypes.every(t => t === 'integer' || t === 'float');
        if (allNumeric) {
            return 'float';
        }

        // Otherwise, return the type of the first valid value.
        return detectedTypes[0];
    }
}
