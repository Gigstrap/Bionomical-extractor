import { Injectable, Logger } from '@nestjs/common';
import { Groq } from 'groq-sdk';
import { ArangoService } from '../db/arango.service';

@Injectable()
export class AiService {
    private readonly logger = new Logger(AiService.name);
    private readonly groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

    constructor(private readonly arangoService: ArangoService) { }

    async generateColumnDescriptions(filename: string, csvUploadId: string, company: string) {
        try {
            const csvCollectionName = `${filename}_csv_${csvUploadId}`;
            const descCollectionName = `${filename}_desc_${csvUploadId}`;

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

            const fullPrompt = `
    You are given data from the company "${company}" uploaded in CSV file "${filename}" (ID: "${csvUploadId}"). 
    For each field, use the field name and the first 100 sample values to generate a descriptive explanation of what the field represents. So please analyze what each field is about and write a detailed description.
    
    ${promptParts.join('\n')}
    
    Return the response as a valid JSON array with objects in this format:
    [
      { "field": "fieldName", "description": "description of field" },
      { "field": "fieldName", "description": "description of field" }
    ]
      and don't add any additional text to the response.
    `;

            // Fetch AI-generated descriptions
            const aiResponse = await this.fetchResponse(fullPrompt);
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
            this.logger.log('Raw AI Response:', rawResponse);

            // Extract only JSON part from the response
            const jsonMatch = rawResponse.match(/```json\n([\s\S]+?)\n```/);
            if (jsonMatch && jsonMatch[1]) {
                return jsonMatch[1].trim();
            }

            // If AI response contains valid JSON directly (without markdown)
            if (rawResponse.startsWith('[') && rawResponse.endsWith(']')) {
                return rawResponse;
            }

            throw new Error('AI response does not contain valid JSON.');
        } catch (error) {
            throw new Error('Failed to fetch AI response.');
        }
    }

}
