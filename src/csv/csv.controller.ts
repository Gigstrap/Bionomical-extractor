import { Controller, Post, UseInterceptors, UploadedFiles, BadRequestException } from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { CsvService } from './csv.service';
import { ApiConsumes, ApiBody, ApiHeader } from '@nestjs/swagger';
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
    @ApiHeader({
        name: 'x-passcode',
        required: true,
        description: 'Passcode for API access',
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
                files.map(file => this.csvService.csvFileUpload(file.buffer, file.originalname))
            );

            // Filter out any results that indicate the file already exists
            const existingFiles = results.filter(result => result.message);
            if (existingFiles.length > 0) {
                return {
                    message: 'Some files were not uploaded because they already exist.',
                    existingFiles: existingFiles.map(result => ({
                        filename: result.filename,
                        csvCollectionName: result.csvCollectionName,
                        message: result.message,
                    })),
                };
            }
            return {
                message: 'CSV files processed and stored successfully',
                uploadedFiles: results.map(result => ({
                    filename: result.filename,
                    csvCollectionName: result.csvCollectionName,
                    importResult: result.importResult,
                })),
            };
        } catch (error) {
            throw new BadRequestException('Error processing CSV files');
        }
    }
}
