import { forwardRef, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { UsersRepository } from './users.repository';
import { User, UserSchema } from './user.schema';
import { UsersMapper } from './users.mapper';
import { EnvironmentVariables } from '../_utils/config/env.config';
import { EncryptionModule } from '../encryption/encryption.module';
import { UniqueExistsConstraint } from 'src/_utils/decorators/unique-exists.decorator';
import { NodemailerModule } from '../nodemailer/nodemailer.module';
import { AuthModule } from 'src/auth/auth.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: async (configService: ConfigService<EnvironmentVariables, true>) => ({
        secret: configService.get('JWT_SECRET'),
        signOptions: { expiresIn: configService.get('JWT_EXPIRATION') },
      }),
    }),
    forwardRef(() => JwtModule),
    EncryptionModule,
    NodemailerModule,
    forwardRef(() => AuthModule),
  ],
  providers: [UsersService, UsersRepository, UsersMapper, UniqueExistsConstraint],
  controllers: [UsersController],
  exports: [UsersService, UsersRepository, UsersMapper],
})
export class UsersModule {}
