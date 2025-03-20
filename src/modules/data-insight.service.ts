import { Injectable } from '@nestjs/common';
import { DatabaseService } from './Database/database.service';
import * as csv from 'csv-parser';
import { Readable } from 'stream';

@Injectable()
export class DataInsightService {
    constructor(private readonly databaseService: DatabaseService) { }

    async processCsv(file: Express.Multer.File) {
        const results: any[] = [];
        let headers: string[] = [];

        return new Promise((resolve, reject) => {
            const stream = new Readable();
            stream.push(file.buffer);
            stream.push(null);

            stream
                .pipe(csv())
                .on('data', (data) => {
                    if (headers.length === 0) {
                        headers = Object.keys(data);
                    }
                    const filteredData = Object.fromEntries(
                        Object.entries(data).filter(([key]) => {
                            const hasHeader = headers.includes(key) && headers[headers.indexOf(key)] !== '';
                            return hasHeader && key !== '';
                        })
                    );
                    results.push(filteredData);
                })
                .on('end', async () => {
                    try {
                        await this.databaseService.db.collection('csv-data').import(results);
                        resolve({ message: 'Data imported successfully', count: results.length });
                    } catch (error) {
                        reject(error);
                    }
                })
                .on('error', (error) => reject(error));
        });
    }
}
