import { Controller, Post, UseInterceptors, UploadedFiles, BadRequestException, Logger } from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { CsvService } from './csv.service';
import { ApiConsumes, ApiBody, ApiHeader } from '@nestjs/swagger';
import * as multer from 'multer';
import { existsSync, mkdirSync } from 'fs';

@Controller('csv')
export class CsvController {
    private readonly logger = new Logger(CsvController.name);

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
        FilesInterceptor('files', undefined, {
            storage: multer.diskStorage({
                destination: './uploads',
                filename: (req, file, cb) => {
                    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
                    cb(null, file.fieldname + '-' + uniqueSuffix + '-' + file.originalname);
                }
            }),
            limits: {
                fileSize: 1024 * 1024 * 1024, // 1GB
                files: 5
            },
            fileFilter: (req, file, cb) => {
                if (!file.originalname.match(/\.(csv)$/)) {
                    return cb(new BadRequestException('Only CSV files are allowed!'), false);
                }
                cb(null, true);
            },
        }),
    )
    async uploadCsv(@UploadedFiles() files: Express.Multer.File[]) {
        // Ensure the uploads directory exists
        const uploadsDir = './uploads';
        if (!existsSync(uploadsDir)) {
            mkdirSync(uploadsDir); // Create the directory if it doesn't exist
        }

        if (!files || files.length === 0) {
            throw new BadRequestException('No files uploaded');
        }
        try {
            const results = [];
            const errors = [];

            // Process files sequentially to avoid memory issues
            for (const file of files) {
                try {
                    const result = await this.csvService.csvFileUpload(file.path, file.originalname);
                    results.push(result);
                } catch (error) {
                    this.logger.error(`Error processing file ${file.originalname}:`, error);
                    errors.push({
                        filename: file.originalname,
                        error: error.message || 'Unknown error occurred'
                    });
                }
            }

            if (errors.length > 0) {
                return {
                    message: 'Some files were not uploaded because they already exist.',
                    existingFiles: errors,
                };
            }
            return {
                message: 'CSV files processed and stored successfully',
                uploadedFiles: results.map(result => ({
                    filename: result.filename,
                    csvCollectionName: result.csvCollectionName,
                    message: result.message,
                    statusCode: result.statusCode
                })),
            };
        } catch (error) {
            throw new BadRequestException('Error processing CSV files');
        }
    }
}