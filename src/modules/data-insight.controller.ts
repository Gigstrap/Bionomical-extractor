import { Controller, Post, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { DataInsightService } from './data-insight.service';
import { ApiConsumes, ApiBody } from '@nestjs/swagger';
import * as multer from 'multer';

@Controller('data-insight')
export class DataInsightController {
    constructor(private readonly dataInsightService: DataInsightService) { }

    @Post('upload-csv')
    @ApiConsumes('multipart/form-data')
    @ApiBody({
        description: 'Upload a CSV file',
        required: true,
        schema: {
            type: 'object',
            properties: {
                file: {
                    type: 'string',
                    format: 'binary',
                },
            },
        },
    })
    @UseInterceptors(FileInterceptor('file', {
        storage: multer.memoryStorage(), // Use memory storage
    }))
    async uploadCsv(@UploadedFile() file: Express.Multer.File) {
        return this.dataInsightService.processCsv(file);
    }
}
