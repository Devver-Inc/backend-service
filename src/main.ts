import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { useContainer } from 'class-validator';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { EnvironmentVariables } from './_utils/config/env.config';
import SwaggerCustomOptionsConfig from './_utils/config/swagger-custom-options.config';
import ValidationPipeOptionsConfig from './_utils/config/validation-pipe-options.config';
import { MongoErrorException } from './_utils/exceptions/mongo-error.exception';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService<EnvironmentVariables, true>);

  useContainer(app.select(AppModule), { fallbackOnErrors: true });

  app
    .useGlobalFilters(new MongoErrorException())
    .setGlobalPrefix('api/v1')
    .useGlobalPipes(new ValidationPipe(ValidationPipeOptionsConfig))
    .enableCors({
      exposedHeaders: ['Content-Disposition'],
      origin: true,
      credentials: true,
    });

  const config = new DocumentBuilder()
    .setTitle('Devver API')
    .setDescription('Routes description of Devver API')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/doc', app, document, SwaggerCustomOptionsConfig);

  return app.listen(configService.get('PORT'));
}

void bootstrap();
