import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { MemoryStoredFile, NestjsFormDataModule } from 'nestjs-form-data';
import { EnvironmentVariables, validateEnv } from './_utils/config/env.config';
import { CommentsModule } from './comments/comments.module';
import { DeploymentsModule } from './deployments/deployments.module';
import { MinioModule } from './minio/minio.module';
import { ProjectsModule } from './projects/projects.module';
import { UsersModule } from './users/users.module';
import { WebhooksModule } from './webhooks/webhooks.module';

@Module({
  imports: [
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (
        configService: ConfigService<EnvironmentVariables, true>,
      ) => ({
        uri: configService.get('DATABASE').DATABASE_URL,
        dbName: configService.get('DATABASE').DATABASE_NAME,
      }),
    }),
    ConfigModule.forRoot({ validate: validateEnv, isGlobal: true }),
    NestjsFormDataModule.config({ isGlobal: true, storage: MemoryStoredFile }),
    UsersModule,
    WebhooksModule,
    MinioModule,
    ProjectsModule,
    CommentsModule,
    DeploymentsModule,
  ],
})
export class AppModule {}
