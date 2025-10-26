import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { LoginDto } from "./_utils/dto/request/login.dto";
import { UsersRepository } from "src/users/users.repository";
import { ConfirmRecoverAccountPasswordDto } from "./_utils/dto/request/confirm-recover-account-password.dto";
import { RecoverAccountPasswordDto } from "./_utils/dto/request/recover-account-password.dto";
import { UsersMapper } from "src/users/users.mapper";
import { ErrorCodes } from "src/_utils/enums/error-codes.enum";
import { GetUserDto } from "src/users/_utils/dto/response/get-user.dto";
import { LoginResponseDto } from "./_utils/dto/response/login-response.dto";
import bcrypt from "bcrypt";
import JwtPayload from "./_utils/interfaces/jwt-payload.interface";
import { randomBytes } from "crypto";
import { RefreshTokenDto } from "./_utils/dto/request/refresh-token.dto";
import { UserDocument } from "src/users/user.schema";
import { EncryptionService } from "src/encryption/encryption.service";
import { EnvironmentVariables } from "src/_utils/config/env.config";

@Injectable()
export class AuthService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly jwtService: JwtService,
    private readonly usersMapper: UsersMapper,
    private readonly encryptionService: EncryptionService,
    private readonly configService: ConfigService<EnvironmentVariables, true>
  ) {}

  async login(body: LoginDto): Promise<LoginResponseDto> {
    const user = await this.validateUser(body.email, body.password);
    const payload: JwtPayload = {
      email: user.email!,
      id: user.id,
      role: user.role,
    };
    ("");
    const accessToken = this.jwtService.sign(payload);
    const refreshToken = this.generateRefreshToken();
    const refreshTokenExpiresAt = new Date();

    const expirationDays = body.rememberMe
      ? this.configService.get("REFRESH_TOKEN_EXPIRATION_DAYS_REMEMBER_ME")
      : this.configService.get("REFRESH_TOKEN_EXPIRATION_DAYS");

    refreshTokenExpiresAt.setDate(
      refreshTokenExpiresAt.getDate() + expirationDays
    );

    await this.usersRepository.updateRefreshToken(
      user.id,
      refreshToken,
      refreshTokenExpiresAt,
      body.rememberMe
    );

    return {
      accessToken,
      refreshToken,
      user: this.usersMapper.toGetUserDto(user),
    };
  }

  async recoverAccountPassword(body: RecoverAccountPasswordDto) {}

  async confirmRecoverAccountPassword(
    body: ConfirmRecoverAccountPasswordDto
  ): Promise<GetUserDto> {
    const user = await this.usersRepository.findOneByRecoveryTokenOrThrow(
      body.token
    );
    const encryptedPassword = await this.encryptionService.encrypt(
      body.password
    );
    return this.usersRepository
      .updatePasswordByIdOrThrow(user.id, encryptedPassword)
      .then(this.usersMapper.toGetUserDto);
  }

  async refreshToken(body: RefreshTokenDto): Promise<LoginResponseDto> {
    try {
      const user = await this.usersRepository.findOneByRefreshTokenOrThrow(
        body.refreshToken
      );

      const payload: JwtPayload = {
        email: user.email!,
        id: user.id,
        role: user.role,
      };
      const accessToken = this.jwtService.sign(payload);
      const newRefreshToken = this.generateRefreshToken();
      const refreshTokenExpiresAt = new Date();
      const expirationDays = user.rememberMe
        ? this.configService.get("REFRESH_TOKEN_EXPIRATION_DAYS_REMEMBER_ME")
        : this.configService.get("REFRESH_TOKEN_EXPIRATION_DAYS");
      refreshTokenExpiresAt.setDate(
        refreshTokenExpiresAt.getDate() + expirationDays
      );

      await this.usersRepository.updateRefreshToken(
        user.id,
        newRefreshToken,
        refreshTokenExpiresAt,
        user.rememberMe
      );

      return {
        accessToken,
        refreshToken: newRefreshToken,
        user: this.usersMapper.toGetUserDto(user),
      };
    } catch (error) {
      throw new UnauthorizedException(ErrorCodes.INVALID_REFRESH_TOKEN);
    }
  }

  logout = async (connectedUser: UserDocument) =>
    this.usersRepository.clearRefreshToken(connectedUser.id);

  private async validateUser(
    email: string,
    password: string
  ): Promise<UserDocument> {
    const user = await this.usersRepository.findOneByEmailOrThrow(email);
    const passwordStatus = this.encryptionService.compare(
      password,
      user.password!
    );

    if (!passwordStatus) {
      throw new UnauthorizedException(ErrorCodes.INVALID_CREDENTIALS);
    }

    return user;
  }

  private generateRefreshToken = (): string => randomBytes(64).toString("hex");
}
