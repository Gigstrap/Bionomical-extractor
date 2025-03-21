import { Module } from '@nestjs/common';
import { CsvController } from './csv.controller';
import { CsvService } from './csv.service';
import { ArangoService } from '../db/arango.service';

@Module({
    controllers: [CsvController],
    providers: [CsvService, ArangoService],
})
export class CsvModule { }
