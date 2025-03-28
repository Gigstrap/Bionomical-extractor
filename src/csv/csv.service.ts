import { Injectable, Logger } from '@nestjs/common';
import * as csvParser from 'csv-parser';
import * as path from 'path';
import { ArangoService } from '../db/arango.service';
import { AiService } from '../ai/ai.service';
import { createReadStream, unlink } from 'fs';

@Injectable()
export class CsvService {
    private readonly logger = new Logger(CsvService.name);
    private readonly BATCH_SIZE = 50000; // Configurable batch size

    constructor(
        private readonly arangoService: ArangoService,
        private readonly aiService: AiService,
    ) { }

    async csvFileUpload(filePath: string, originalFilename: string): Promise<{ filename: string; csvUploadId?: string; csvCollectionName: string; message?: string, statusCode: number }> {
        const filename = path.basename(originalFilename, path.extname(originalFilename)).replace(/\s+/g, '_');
        const csvCollectionName = `${filename}_csv`;

        // Check if the collection already exists
        const collectionExists = await this.arangoService.getCollectionExists(csvCollectionName);
        if (collectionExists) {
            return { filename, csvCollectionName, message: 'The file with same name already exists.', statusCode: 409 };
        }

        // Create collection before starting the import
        await this.arangoService.createCollection(csvCollectionName);

        // Process the file in streaming mode
        const { totalRows } = await this.processFileInBatches(filePath, csvCollectionName);

        return {
            filename,
            csvCollectionName,
            message: `File Uploaded Successfully. Total Rows: ${totalRows}`,
            statusCode: 201

        };
    }

    private async processFileInBatches(filePath: string, csvCollectionName: string): Promise<{ totalRows: number, columnTypes: any }> {
        return new Promise((resolve, reject) => {
            let currentBatch: any[] = [];
            let totalRows = 0;
            let columnTypes: any = null;
            let isFirstBatch = true;

            const stream = createReadStream(filePath)
                .pipe(csvParser())
                .on('data', async (data) => {
                    currentBatch.push(data);
                    totalRows++;

                    if (currentBatch.length >= this.BATCH_SIZE) {
                        stream.pause(); // Pause the stream while processing the batch

                        try {
                            if (isFirstBatch) {
                                // Determine column types only from the first batch
                                columnTypes = await this.aiService.determineColumnTypes(currentBatch);
                                isFirstBatch = false;
                            }

                            // Convert and insert the batch
                            await this.processBatch(currentBatch, columnTypes, csvCollectionName);

                            this.logger.log(`Processed ${totalRows} rows so far...`);
                            currentBatch = []; // Clear the batch
                            stream.resume(); // Resume the stream
                        } catch (error) {
                            stream.destroy(error); // Destroy the stream on error
                        }
                    }
                })
                .on('end', async () => {
                    try {
                        // Process any remaining records
                        if (currentBatch.length > 0) {
                            if (isFirstBatch) {
                                columnTypes = await this.aiService.determineColumnTypes(currentBatch);
                            }
                            await this.processBatch(currentBatch, columnTypes, csvCollectionName);
                        }

                        // Clean up
                        unlink(filePath, (err) => {
                            if (err) this.logger.error(`Error deleting file: ${err}`);
                        });

                        resolve({ totalRows, columnTypes });
                    } catch (error) {
                        reject(error);
                    }
                })
                .on('error', (error) => {
                    reject(error);
                });
        });
    }

    private async processBatch(batch: any[], columnTypes: any, csvCollectionName: string): Promise<void> {
        try {
            // Convert data types
            const convertedBatch = this.convertDataTypes(batch, columnTypes);

            // Insert the batch into ArangoDB
            await this.arangoService.insertData(csvCollectionName, convertedBatch);
        } catch (error) {
            this.logger.error(`Error processing batch: ${error}`);
            throw error;
        }
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