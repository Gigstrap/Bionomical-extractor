import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { Database, aql } from 'arangojs';

@Injectable()
export class ArangoService implements OnModuleInit {
    private db: Database;
    private readonly logger = new Logger(ArangoService.name);

    async onModuleInit() {
        this.db = new Database({
            url: process.env.ARANGO_URL,
            databaseName: process.env.ARANGO_DB_NAME,
            auth: {
                username: process.env.ARANGO_USERNAME,
                password: process.env.ARANGO_PASSWORD,
            }
        });

        this.logger.log('Connected to ArangoDB');
    }

    // Create a collection if it does not exist.
    async createCollection(collectionName: string) {
        const collection = this.db.collection(collectionName);
        const exists = await collection.exists();
        if (!exists) {
            await collection.create();
            this.logger.log(`Collection ${collectionName} created`);
        }
        return collection;
    }

    // Insert data into the specified collection.
    async insertData(collectionName: string, data: any[]) {
        const collection = await this.createCollection(collectionName);
        return await collection.import(data);
    }

    // Get sample values for a given column from a specified collection.
    async getColumnSampleData(collectionName: string, columnName: string, limit = 100) {
        const query = aql`
      FOR doc IN ${this.db.collection(collectionName)}
        FILTER HAS(doc, ${columnName})
        LIMIT ${limit}
        RETURN doc[${columnName}]
    `;
        const cursor = await this.db.query(query);
        return await cursor.all();
    }

    // Get column names from one sample document in the specified collection.
    async getCollectionColumnNames(collectionName: string): Promise<string[]> {
        const query = aql`
      FOR doc IN ${this.db.collection(collectionName)}
        LIMIT 1
        RETURN ATTRIBUTES(doc)
    `;
        const cursor = await this.db.query(query);
        const attributes = await cursor.next();
        return attributes ? attributes.filter((attr) => attr !== '_key') : [];
    }

    // Store the AI-generated description in a specified description collection.
    async storeAIDescription(
        collectionName: string,
        company: string,
        descriptions: { field: string; description: string; }[]
    ) {
        const doc = {
            company,
            descriptions, // Storing all descriptions in an array
            createdAt: new Date(),
        };

        const collection = await this.createCollection(collectionName); // Ensure collection is created
        await collection.save(doc);

    }

}
