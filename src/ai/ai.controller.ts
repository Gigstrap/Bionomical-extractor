import { Controller, Get, Query, BadRequestException, Body, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { AiService } from './ai.service';
import { ApiBody, ApiConsumes, ApiHeader } from '@nestjs/swagger';
import * as multer from 'multer';
import { FileInterceptor } from '@nestjs/platform-express';
@Controller('ai')
export class AiController {
    constructor(private readonly aiService: AiService) { }

    @Get('description')
    @ApiHeader({
        name: 'x-passcode',
        required: true,
        description: 'Passcode for API access',
    })
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


    @Post('analyze-csv')
    @ApiHeader({
        name: 'x-passcode',
        required: true,
        description: 'Passcode for API access',
    })
    @ApiConsumes('multipart/form-data')
    @UseInterceptors(
        FileInterceptor('file', {
            storage: multer.memoryStorage(),
        }),
    )
    @ApiBody({
        description: 'CSV file upload',
        schema: {
            type: 'object',
            properties: {
                fileDescription: { type: 'string', example: 'Description of the CSV file' },
                file: { type: 'string', format: 'binary' },
            },
        },
    })
    async analyzeCsvFile(@UploadedFile() file: Express.Multer.File, @Body() body: { fileDescription?: string }) {
        if (!file) {
            throw new BadRequestException('CSV file is required.');
        }

        return await this.aiService.analyzeUploadedCSV(file.buffer, body.fileDescription);
    }
}
