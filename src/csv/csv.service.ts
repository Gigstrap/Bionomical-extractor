import { Injectable, Logger, ConflictException } from '@nestjs/common';
import { Readable } from 'stream';
import * as csvParser from 'csv-parser';
import * as path from 'path';
import { ArangoService } from '../db/arango.service';
import { AiService } from '../ai/ai.service';

@Injectable()
export class CsvService {
    private readonly logger = new Logger(CsvService.name);

    constructor(
        private readonly arangoService: ArangoService,
        private readonly aiService: AiService,
    ) { }

    async csvFileUpload(fileBuffer: Buffer, originalFilename: string): Promise<{ filename: string; csvUploadId?: string; csvCollectionName: string; importResult?: any; message?: string }> {
        const filename = path.basename(originalFilename, path.extname(originalFilename)).replace(/\s+/g, '_');
        const csvCollectionName = `${filename}_csv`;

        // Check if the collection already exists
        const collectionExists = await this.arangoService.getCollectionExists(csvCollectionName);
        if (collectionExists) {
            throw new ConflictException('This file has already been uploaded.');
        }

        // Parse CSV into an array of objects
        const results = await this.parseCsv(fileBuffer);

        // Determine column types using AI
        const columnTypes = await this.aiService.determineColumnTypes(results);

        // Convert data to the detected types
        const convertedResults = this.convertDataTypes(results, columnTypes);

        // Insert converted data into ArangoDB
        const importResult = await this.arangoService.insertData(csvCollectionName, convertedResults);

        return { filename, csvCollectionName, importResult };
    }

    private async parseCsv(fileBuffer: Buffer): Promise<any[]> {
        return new Promise((resolve, reject) => {
            const results = [];
            const stream = Readable.from(fileBuffer);
            stream
                .pipe(csvParser())
                .on('data', (data) => results.push(data))
                .on('end', () => resolve(results))
                .on('error', (error) => reject(error));
        });
    }

    private convertDataTypes(data: any[], typeMap: { [field: string]: string }): any[] {
        return data.map(row => {
            const newRow = { ...row };
            for (const field in typeMap) {
                const type = typeMap[field];
                const value = row[field];
                if (value !== null && value !== undefined) {
                    try {
                        switch (type) {
                            case 'integer':
                                const intValue = parseInt(value, 10);
                                newRow[field] = isNaN(intValue) ? value : intValue;
                                break;
                            case 'float':
                                const floatValue = parseFloat(value);
                                newRow[field] = isNaN(floatValue) ? value : floatValue;
                                break;
                            case 'boolean':
                                const lower = value.toLowerCase();
                                if (lower === 'true' || lower === '1') {
                                    newRow[field] = true;
                                } else if (lower === 'false' || lower === '0') {
                                    newRow[field] = false;
                                } else {
                                    newRow[field] = value;
                                }
                                break;
                            case 'date':
                                const date = new Date(value);
                                newRow[field] = isNaN(date.getTime()) ? value : date;
                                break;
                            case 'string':
                            default:
                                newRow[field] = value;
                                break;
                        }
                    } catch (error) {
                        this.logger.warn(`Failed to convert field ${field} with value ${value} to type ${type}`);
                        newRow[field] = value; // Fallback to string
                    }
                }
            }
            return newRow;
        });
    }
}
