import { Module } from '@nestjs/common';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { ArangoService } from '../db/arango.service';

@Module({
    controllers: [AiController],
    providers: [AiService, ArangoService],
})
export class AiModule { }
