import { Module } from '@nestjs/common';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { ArangoService } from '../db/arango.service';
import { CsvService } from 'src/csv/csv.service';

@Module({
    controllers: [AiController],
    providers: [AiService, ArangoService, CsvService],
})
export class AiModule { }
