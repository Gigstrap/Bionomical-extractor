import { Controller, Post, UseInterceptors, UploadedFiles, BadRequestException } from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { CsvService } from './csv.service';
import { ApiConsumes, ApiBody } from '@nestjs/swagger';
import * as multer from 'multer';

@Controller('csv')
export class CsvController {
    constructor(private readonly csvService: CsvService) { }

    @Post('upload')
    @ApiConsumes('multipart/form-data')
    @ApiBody({
        description: 'Upload multiple CSV files',
        required: true,
        schema: {
            type: 'object',
            properties: {
                files: {
                    type: 'array',
                    items: {
                        type: 'string',
                        format: 'binary',
                    },
                },
            },
        },
    })
    @UseInterceptors(
        FilesInterceptor('files', undefined, { // Allow up to 10 files at once
            storage: multer.memoryStorage(), // Store in memory instead of disk
            fileFilter: (req, file, cb) => {
                if (!file.originalname.match(/\.(csv)$/)) {
                    return cb(new BadRequestException('Only CSV files are allowed!'), false);
                }
                cb(null, true);
            },
        }),
    )
    async uploadCsv(@UploadedFiles() files: Express.Multer.File[]) {
        if (!files || files.length === 0) {
            throw new BadRequestException('No files uploaded');
        }

        try {
            const results = await Promise.all(
                files.map(file => this.csvService.processAndStore(file.buffer, file.originalname))
            );

            return {
                message: 'CSV files processed and stored successfully',
                uploadedFiles: results.map(result => ({
                    filename: result.filename,
                    csvUploadId: result.csvUploadId,
                    importResult: result.importResult,
                })),
            };
        } catch (error) {
            throw new BadRequestException('Error processing CSV files');
        }
    }
}
