import { Controller, Post, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CsvService } from './csv.service';
import { ApiConsumes, ApiBody } from '@nestjs/swagger';
import * as multer from 'multer';

@Controller('csv')
export class CsvController {
    constructor(private readonly csvService: CsvService) { }

    @Post('upload')
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
    @UseInterceptors(
        FileInterceptor('file', {
            storage: multer.memoryStorage(), // Store in memory instead of disk
            fileFilter: (req, file, cb) => {
                if (!file.originalname.match(/\.(csv)$/)) {
                    return cb(new BadRequestException('Only CSV files are allowed!'), false);
                }
                cb(null, true);
            },
        }),
    )
    async uploadCsv(@UploadedFile() file: Express.Multer.File) {
        if (!file) {
            throw new BadRequestException('No file uploaded');
        }
        try {
            const result = await this.csvService.processAndStore(file.buffer, file.originalname);
            return {
                message: 'CSV processed and stored successfully',
                csvUploadId: result.csvUploadId,
                importResult: result.importResult,
            };
        } catch (error) {
            throw new BadRequestException('Error processing CSV file');
        }
    }
}
