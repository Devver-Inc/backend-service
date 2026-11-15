import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { useContainer } from 'class-validator';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { EnvironmentVariables } from './_utils/config/env.config';
import { escapeRegex } from './_utils/functions/escape-regex.function';
import SwaggerCustomOptionsConfig from './_utils/config/swagger-custom-options.config';
import ValidationPipeOptionsConfig from './_utils/config/validation-pipe-options.config';
import { MongoExceptionFilter } from './_utils/exceptions/mongo-error.exception';
import { NestExpressApplication } from '@nestjs/platform-express';

async function bootstrap() {
  // rawBody: the Logto webhook signature is an HMAC of the exact bytes received.
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    rawBody: true,
  });

  useContainer(app.select(AppModule), { fallbackOnErrors: true });

  const configService = app.get(ConfigService<EnvironmentVariables, true>);
  const server = configService.get('SERVER');
  const allowedOrigins = configService.get('CORS').ALLOWED_ORIGINS;
  const baseDomain = configService.get('DEPLOY_AGENT').K8S_BASE_DOMAIN;
  app.use(helmet());

  app
    .useGlobalFilters(new MongoExceptionFilter())
    .setGlobalPrefix('api/v1')
    .useGlobalPipes(new ValidationPipe(ValidationPipeOptionsConfig))
    .enableCors({
      origin: [
        ...(allowedOrigins.length ? allowedOrigins : [server.FRONTEND_URL]),
        // The overlay on every preview host calls the API (comments, overlay-access).
        new RegExp(
          `^https://[a-z0-9-]+\\.preview\\.${escapeRegex(baseDomain)}$`,
        ),
      ],
    });

  app.set('query parser', 'extended');

  const config = new DocumentBuilder()
    .setTitle('Devver API')
    .setDescription('Routes description of Devver API')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  if (server.NODE_ENV !== 'production') {
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/doc', app, document, SwaggerCustomOptionsConfig);
  }

  return app.listen(server.PORT);
}

void bootstrap();
