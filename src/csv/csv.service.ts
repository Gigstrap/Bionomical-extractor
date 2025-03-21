import { Injectable, Logger } from '@nestjs/common';
import * as csvParser from 'csv-parser';
import { v4 as uuidv4 } from 'uuid';
import { ArangoService } from '../db/arango.service';
import * as path from 'path';
import { Readable } from 'stream';

@Injectable()
export class CsvService {
    private readonly logger = new Logger(CsvService.name);

    constructor(private readonly arangoService: ArangoService) { }

    async processAndStore(fileBuffer: Buffer, originalFilename: string): Promise<{ csvUploadId: string; importResult: any }> {
        const csvUploadId = uuidv4();
        const filename = path.basename(originalFilename, path.extname(originalFilename)).replace(/\s+/g, '_');
        const csvCollectionName = `${filename}_csv_${csvUploadId}`;

        return new Promise((resolve, reject) => {
            const results = [];
            const stream = Readable.from(fileBuffer); // Convert buffer to readable stream

            stream
                .pipe(csvParser())
                .on('data', (data) => results.push(data))
                .on('end', async () => {
                    try {
                        const importResult = await this.arangoService.insertData(csvCollectionName, results);
                        this.logger.log(`Inserted ${results.length} documents into collection ${csvCollectionName}`);
                        resolve({ csvUploadId, importResult });
                    } catch (error) {
                        this.logger.error('Error inserting data into ArangoDB', error);
                        reject(error);
                    }
                })
                .on('error', (error) => {
                    this.logger.error('Error reading CSV data', error);
                    reject(error);
                });
        });
    }
}
