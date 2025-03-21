import { Controller, Get, Query, BadRequestException } from '@nestjs/common';
import { AiService } from './ai.service';

@Controller('ai')
export class AiController {
    constructor(private readonly aiService: AiService) { }

    // Endpoint example: /ai/generate?csvUploadId=YOUR_CSV_ID&company=AcmeInc
    @Get('generate')
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
}
