import { ArangoService } from './db/arango.service';
import { AiModule } from './ai/ai.module';
import { CsvModule } from './csv/csv.module';
import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { PasscodeMiddleware } from './middleware/passcode.middleware';

@Module({
  imports: [
    AiModule,
    CsvModule,
    ConfigModule.forRoot()],
  controllers: [AppController],
  providers: [
    ArangoService, AppService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(PasscodeMiddleware)
      .forRoutes('*');
  }
}
