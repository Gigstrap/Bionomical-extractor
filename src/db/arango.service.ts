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
    async insertData(collectionName: string, data: any[]): Promise<any> {
        try {
            const collection = this.db.collection(collectionName);

            const result = await collection.import(data, {
                onDuplicate: 'ignore',
                complete: true
            });

            return result;
        } catch (error) {
            this.logger.error(`Error inserting data into ${collectionName}:`, error);
            throw error;
        }
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
        fileSummary: string,
        descriptions: { field: string; description: string; dataType: string }[]
    ) {
        const doc = {
            company,
            fileSummary,
            descriptions,
            createdAt: new Date(),
        };

        const collection = await this.createCollection(collectionName);
        await collection.save(doc);
    }

    async getAIDescription(collectionName: string): Promise<{ fileSummary: string; descriptions: any[] }> {
        try {
            const collection = await this.createCollection(collectionName);
            const query = aql`
                FOR doc IN ${collection}
                SORT doc.createdAt DESC
                LIMIT 1
                RETURN { fileSummary: doc.fileSummary, descriptions: doc.descriptions }
            `;
            const cursor = await this.db.query(query);
            const result = await cursor.next();
            this.logger.log('Fetched AI descriptions:', result);
            return result || { fileSummary: '', descriptions: [] };
        } catch (error) {
            this.logger.error('Error fetching AI descriptions:', error);
            return { fileSummary: '', descriptions: [] };
        }
    }

    async executeAqlQuery(aqlQuery: any) {
        try {
            const cursor = await this.db.query(aqlQuery);
            const result = await cursor.all();
            return result;
        } catch (error) {
            this.logger.error('Error executing AQL query:', error);
            throw new Error('Failed to execute AQL query.');
        }
    }

    async getSampleDocuments(collectionName: string, limit: number): Promise<any[]> {
        try {
            const query = aql`
                FOR doc IN ${this.db.collection(collectionName)}
                LIMIT ${limit}
                RETURN doc
            `;
            const result = await this.executeAqlQuery(query);
            this.logger.log(`Fetched sample documents from ${collectionName}:`, result);
            return result;
        } catch (error) {
            this.logger.error(`Error fetching sample documents from ${collectionName}:`, error);
            return [];
        }
    }

    async getCollectionExists(collectionName: string): Promise<boolean> {
        const collection = this.db.collection(collectionName);
        return await collection.exists();
    }
}