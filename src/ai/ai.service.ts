import { Injectable, Logger } from '@nestjs/common';
import { Groq } from 'groq-sdk';
import { ArangoService } from '../db/arango.service';
import { prompts } from './prompts';

@Injectable()
export class AiService {
    private readonly logger = new Logger(AiService.name);
    private readonly groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

    constructor(private readonly arangoService: ArangoService) { }

    async generateColumnDescriptions(filename: string, csvUploadId: string, company: string) {
        try {
            const csvCollectionName = `${filename}_csv_${csvUploadId}`;
            const descCollectionName = `${filename}_description_${csvUploadId}`;

            // Retrieve column names from the specific CSV collection.
            const columnNames = await this.arangoService.getCollectionColumnNames(csvCollectionName);
            if (!columnNames.length) {
                throw new Error('No columns found for the given CSV upload ID.');
            }

            // Filter out unwanted fields
            const filteredColumnNames = columnNames.filter(col => !['_rev', '_key', '_id'].includes(col));

            const promptParts = await Promise.all(
                filteredColumnNames.map(async (col) => {
                    const samples = await this.arangoService.getColumnSampleData(csvCollectionName, col, 100);
                    return `Field name: ${col}\nSamples: ${samples.join(', ')}`;
                })
            );

            // Fetch AI-generated descriptions
            const aiResponse = await this.fetchResponse(prompts.GENERATE_COLUMN_DESCRIPTIONS(filename, csvUploadId, company, promptParts));
            this.logger.log('AI Response:', aiResponse);

            // Ensure the response is a valid JSON array
            let descriptions: { field: string; description: string }[];
            try {
                descriptions = JSON.parse(aiResponse);
                if (!Array.isArray(descriptions)) {
                    throw new Error('AI response is not a valid JSON array.');
                }
            } catch (error) {
                this.logger.error('Failed to parse AI response:', aiResponse);
                throw new Error('AI response is not in valid JSON format.');
            }

            await this.arangoService.storeAIDescription(descCollectionName, company, descriptions);

            return { csvUploadId, descriptions };
        } catch (error) {
            this.logger.error('Error generating AI description:', error);
            throw new Error('Failed to generate column descriptions.');
        }
    }

    async processUserQuery(userQuery: string) {
        try {
            // Extract collection name from the user's query
            const collectionName = await this.extractCollectionName(userQuery);
            if (!collectionName) {
                throw new Error('Could not determine the collection name from user query.');
            }

            // Fetch some sample documents from the collection to understand its structure
            const sampleDocs = await this.arangoService.getSampleDocuments(collectionName, 5);
            if (!sampleDocs.length) {
                throw new Error(`No sample documents found in collection: ${collectionName}`);
            }

            // Get AI-generated AQL query
            const aiResponse = await this.fetchResponse(prompts.GENERATE_AQL_QUERY(collectionName, sampleDocs, userQuery));
            this.logger.log('AI Response:', aiResponse);

            let queryData: { collection: string; aql_query: string };
            try {
                queryData = JSON.parse(aiResponse);
                if (!queryData.collection || !queryData.aql_query) {
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
                    error: 'The generated AQL query failed to execute. Please refine your prompt or try again.'
                };
            }

            return {
                collection: queryData.collection,
                aql_query: queryData.aql_query,
                result: queryResult,
            };
        } catch (error) {
            this.logger.error('Error processing AI query:', error);
            throw new Error('Failed to process AI query.');
        }
    }

    private async fetchResponse(prompt: string): Promise<string> {
        try {
            const response = await this.groq.chat.completions.create({
                messages: [
                    {
                        role: 'user',
                        content: prompt,
                    },
                ],
                model: 'llama-3.3-70b-versatile',
            });
            const rawResponse = response.choices[0]?.message?.content || 'No response available';
            this.logger.log('Raw AI Response from groq:', rawResponse);
            return rawResponse;
        } catch (error) {
            throw new Error('Failed to fetch AI response.');
        }
    }

    private async extractCollectionName(userQuery: string): Promise<string | null> {
        try {
            const aiResponse = await this.fetchResponse(prompts.EXTRACT_COLLECTION_NAME(userQuery));
            this.logger.log('AI Extracted Collection Name:', aiResponse);

            let collectionData: { collection: string | null };
            try {
                collectionData = JSON.parse(aiResponse);
                return collectionData.collection ?? null;
            } catch (error) {
                this.logger.error('Failed to parse AI response:', aiResponse);
                return null;
            }
        } catch (error) {
            this.logger.error('Error extracting collection name via AI:', error);
            return null;
        }
    }
}
