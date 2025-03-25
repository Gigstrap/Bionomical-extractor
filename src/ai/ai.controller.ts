import { Controller, BadRequestException, Body, Post } from '@nestjs/common';
import { AiService } from './ai.service';
import { ApiBody, ApiHeader } from '@nestjs/swagger';
@Controller('ai')
export class AiController {
    constructor(private readonly aiService: AiService) { }

    @Post('description')
    @ApiHeader({
        name: 'x-passcode',
        required: true,
        description: 'Passcode for API access',
    })
    @ApiBody({
        description: 'Parameters for generating descriptions',
        schema: {
            example: {
                collectionName: 'example_csv',
                company: 'example_company',
                fileDescription: 'This CSV contains customer data including IDs and purchase history.'
            }
        }
    })
    async generateDescription(
        @Body() body: { collectionName: string; company?: string; fileDescription?: string }
    ) {
        const { collectionName, company, fileDescription } = body;
        if (!collectionName) {
            throw new BadRequestException('Missing Collection Name');
        }
        const result = await this.aiService.generateColumnDescriptions(collectionName, company, fileDescription);
        return result;
    }

    @Post('prompt')
    @ApiHeader({
        name: 'x-passcode',
        required: true,
        description: 'Passcode for API access',
    })
    @ApiBody({
        description: 'User prompt to process',
        schema: {
            example: {
                "userPrompt": "From all the customers which one customer have the highest revenue of them all",
                "collectionName": "ACDOCA_Sample_csv",
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
