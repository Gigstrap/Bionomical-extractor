import { Module } from '@nestjs/common';
import { CsvController } from './csv.controller';
import { CsvService } from './csv.service';
import { ArangoService } from '../db/arango.service';
import { AiService } from 'src/ai/ai.service';

@Module({
    controllers: [CsvController],
    providers: [CsvService, ArangoService, AiService],
})
export class CsvModule { }
