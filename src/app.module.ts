import { ArangoService } from './db/arango.service';
import { AiModule } from './ai/ai.module';
import { CsvModule } from './csv/csv.module';
import { DatabaseService } from './modules/Database/database.service';
import { DataInsightModule } from './modules/data-insight.module';
import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
@Module({
  imports: [
    AiModule,
    CsvModule,
    DataInsightModule, ConfigModule.forRoot()],
  controllers: [AppController],
  providers: [
    ArangoService,
    DatabaseService, AppService],
})
export class AppModule { }
