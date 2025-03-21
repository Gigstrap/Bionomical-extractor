
import { Controller, Get, Query, BadRequestException, Body, Post } from '@nestjs/common';
import { AiService } from './ai.service';
import { ApiBody } from '@nestjs/swagger';

@Controller('ai')
export class AiController {
    constructor(private readonly aiService: AiService) { }

    @Get('description')
    async generateDescription(
        @Query('filename') filename: string,
        @Query('csvUploadId') csvUploadId: string,
        @Query('company') company: string,
    ) {
        if (!csvUploadId || !company || !filename) {
            throw new BadRequestException('Missing required query parameters');
        }
        const result = await this.aiService.generateColumnDescriptions(filename, csvUploadId, company);
        return result;
    }

    @Post('prompt')
    @ApiBody({
        description: 'User prompt to process',
        schema: {
            example: {
                userPrompt: 'I want to get all unique countries from worldcities_csv_c8581ce0-0090-473f-83ae-dad2831a459a'
            }
        }
    })
    async processNaturalPrompt(@Body('userPrompt') userPrompt: string) {
        if (!userPrompt) {
            throw new BadRequestException('Missing prompt parameter');
        }
        return await this.aiService.processUserQuery(userPrompt);
    }
}
