import { Module } from "@nestjs/common";
import { AuthModule } from "./auth/auth.module";
import { UsersModule } from "./users/users.module";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { EnvironmentVariables, validateEnv } from "./_utils/config/env.config";
import { NodemailerModule } from "./nodemailer/nodemailer.module";
import { MongooseModule } from "@nestjs/mongoose";

@Module({
  imports: [
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: async (
        configService: ConfigService<EnvironmentVariables, true>
      ) => ({
        uri: configService.get("MONGODB_URI"),
      }),
    }),
    ConfigModule.forRoot({ validate: validateEnv, isGlobal: true }),
    AuthModule,
    UsersModule,
    NodemailerModule,
  ],
})
export class AppModule {}
