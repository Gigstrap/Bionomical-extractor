import { Injectable } from '@nestjs/common';
import { Database } from 'arangojs';
@Injectable()
export class DatabaseService {
    public readonly db: Database;

    constructor() {
        this.db = new Database({
            url: process.env.ARANGO_URL,
            databaseName: process.env.ARANGO_DB_NAME,
            auth: {
                username: process.env.ARANGO_USERNAME,
                password: process.env.ARANGO_PASSWORD,
            },
        });
    }
}
