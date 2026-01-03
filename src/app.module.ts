import { Module } from '@nestjs/common';
import { UsersModule } from './users/users.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EnvironmentVariables, validateEnv } from './_utils/config/env.config';
import { MongooseModule } from '@nestjs/mongoose';
import { NestjsFormDataModule } from 'nestjs-form-data';
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
    NestjsFormDataModule.config({ isGlobal: true }),
    UsersModule,
    WebhooksModule,
  ],
})
export class AppModule {}
