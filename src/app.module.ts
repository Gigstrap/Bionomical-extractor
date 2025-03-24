import { ArangoService } from './db/arango.service';
import { AiModule } from './ai/ai.module';
import { CsvModule } from './csv/csv.module';
import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { CollectionsController } from './collections/collections.controller';
@Module({
  imports: [
    AiModule,
    CsvModule,
    ConfigModule.forRoot()],
  controllers: [AppController, CollectionsController],
  providers: [
    ArangoService, AppService],
})
export class AppModule { }
