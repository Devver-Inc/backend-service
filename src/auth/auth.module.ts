import { forwardRef, Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { JwtStrategy } from "./strategy/jwt.strategy";
import { ConfigService } from "@nestjs/config";
import { UsersModule } from "src/users/users.module";
import { EnvironmentVariables } from "../_utils/config/env.config";
import { NodemailerModule } from "../nodemailer/nodemailer.module";
import { EncryptionModule } from "../encryption/encryption.module";

@Module({
  imports: [
    forwardRef(() => UsersModule),
    PassportModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: async (
        configService: ConfigService<EnvironmentVariables, true>
      ) => ({
        secret: configService.get("JWT_SECRET"),
        signOptions: { expiresIn: configService.get("JWT_EXPIRATION") },
      }),
    }),
    NodemailerModule,
    EncryptionModule,
  ],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService],
  controllers: [AuthController],
})
export class AuthModule {}
