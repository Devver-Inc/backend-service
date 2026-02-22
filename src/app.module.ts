import { Module } from '@nestjs/common';
import { UsersModule } from './users/users.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EnvironmentVariables, validateEnv } from './_utils/config/env.config';
import { MongooseModule } from '@nestjs/mongoose';
import { MemoryStoredFile, NestjsFormDataModule } from 'nestjs-form-data';
import { WebhooksModule } from './webhooks/webhooks.module';
import { MinioModule } from './minio/minio.module';
import { ProjectsModule } from './projects/projects.module';
import { CommentsModule } from './comments/comments.module';
import { DeployAgentModule } from './deploy-agent/deploy-agent.module';

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
    DeployAgentModule,
  ],
})
export class AppModule {}
