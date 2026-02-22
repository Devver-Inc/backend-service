import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { useContainer } from 'class-validator';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import {
  CorsConfig,
  EnvironmentVariables,
  ServerConfig,
} from './_utils/config/env.config';
import SwaggerCustomOptionsConfig from './_utils/config/swagger-custom-options.config';
import ValidationPipeOptionsConfig from './_utils/config/validation-pipe-options.config';
import { MongoExceptionFilter } from './_utils/exceptions/mongo-error.exception';
import { NestExpressApplication } from '@nestjs/platform-express';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  useContainer(app.select(AppModule), { fallbackOnErrors: true });

  const configService = app.get(ConfigService<EnvironmentVariables, true>);
  const corsConfig = configService.get<CorsConfig>('CORS');

  app.use(helmet());

  app
    .useGlobalFilters(new MongoExceptionFilter())
    .setGlobalPrefix('api/v1')
    .useGlobalPipes(new ValidationPipe(ValidationPipeOptionsConfig))
    .enableCors({ origin: '*' });

  app.set('query parser', 'extended');

  const config = new DocumentBuilder()
    .setTitle('Devver API')
    .setDescription('Routes description of Devver API')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/doc', app, document, SwaggerCustomOptionsConfig);

  return app.listen(configService.get<ServerConfig>('SERVER').PORT);
}

void bootstrap();
