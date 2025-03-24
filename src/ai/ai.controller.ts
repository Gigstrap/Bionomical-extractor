import { Controller, Get, Query, BadRequestException, Body, Post } from '@nestjs/common';
import { AiService } from './ai.service';
import { ApiBody } from '@nestjs/swagger';

@Controller('ai')
export class AiController {
    constructor(private readonly aiService: AiService) { }

    @Get('description')
    async generateDescription(
        @Query('collectionName') collectionName: string,
        @Query('company') company: string,
    ) {
        if (!collectionName || !company) {
            throw new BadRequestException('Missing required query parameters');
        }
        const result = await this.aiService.generateColumnDescriptions(collectionName, company);
        return result;
    }

    @Post('prompt')
    @ApiBody({
        description: 'User prompt to process',
        schema: {
            example: {
                "userPrompt": "From all the customers which one customer have the highest revenue of them all",
                "collectionName": "ACDOCA_Sample_csv_d679d8f0-3efa-42bf-83d0-db1180a65ca0",
                "datasetContext": "Available dataset context"
            }
        }
    })
    async processNaturalPrompt(@Body() body: { userPrompt: string; collectionName: string; datasetContext?: string }) {
        const { userPrompt, collectionName, datasetContext } = body;
        if (!userPrompt) {
            throw new BadRequestException('Missing prompt parameter');
        }
        return await this.aiService.processUserQuery(userPrompt, collectionName, datasetContext);
    }
}
