import { DataInsightService } from './data-insight.service';
import { DataInsightController } from './data-insight.controller';
import { Module } from '@nestjs/common';
import { DatabaseService } from './Database/database.service';
@Module({
    imports: [],
    controllers: [
        DataInsightController,],
    providers: [
        DataInsightService, DatabaseService],
})
export class DataInsightModule { }
