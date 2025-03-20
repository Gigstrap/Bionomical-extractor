import { DatabaseService } from './modules/Database/database.service';
import { DataInsightModule } from './modules/data-insight.module';
import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
@Module({
  imports: [
    DataInsightModule, ConfigModule.forRoot()],
  controllers: [AppController],
  providers: [
    DatabaseService, AppService],
})
export class AppModule { }
