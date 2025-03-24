import { Controller, Get } from '@nestjs/common';
import { Database } from 'arangojs';

@Controller('collections')
export class CollectionsController {
  private readonly db: Database;

  constructor() {
    this.db = new Database({
      url: process.env.ARANGO_URL, // Update with your ArangoDB URL
      databaseName: process.env.ARANGO_DB_NAME, // Set your database name here
    });
    this.db.useBasicAuth(process.env.ARANGO_USERNAME, process.env.ARANGO_PASSWORD); // Replace with your credentials
  }

  @Get()
  async getCollections(): Promise<string[]> {
    try {
      const collections = await this.db.listCollections();
      return collections
        .map((collection) => collection.name)
        .filter((name) => !name.includes('description')); // Exclude collections with 'description' in the name
    } catch (error) {
      console.error('Error fetching collections:', error);
      throw error;
    }
  }
}