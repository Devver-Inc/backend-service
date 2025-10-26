import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
} from "@nestjs/common";
import { ApiNoContentResponse, ApiOperation, ApiTags } from "@nestjs/swagger";
import { ConfirmRecoverAccountPasswordDto } from "./_utils/dto/request/confirm-recover-account-password.dto";
import { LoginDto } from "./_utils/dto/request/login.dto";
import { RecoverAccountPasswordDto } from "./_utils/dto/request/recover-account-password.dto";
import { AuthService } from "./auth.service";
import { CreateUserDto } from "../users/_utils/dto/request/create-user.dto";
import { UsersService } from "src/users/users.service";
import { RefreshTokenDto } from "./_utils/dto/request/refresh-token.dto";
import { Request } from "express";
import { Protect } from "./_utils/decorator/protect.decorator";
import { ConnectedUser } from "src/_utils/decorators/connecter-user.decorator";
import { UserDocument } from "src/users/user.schema";

@ApiTags("Auth")
@Controller("auth")
export class AuthController {
  constructor(
    private authService: AuthService,
    private readonly usersService: UsersService
  ) {}

  @Post("register")
  @ApiOperation({ summary: "Register a new user." })
  register(@Body() body: CreateUserDto) {
    return this.usersService.createUser(body);
  }

  @Post("login")
  @ApiOperation({ summary: "Login user." })
  login(@Body() body: LoginDto) {
    return this.authService.login(body);
  }

  @Post("forgot-password")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Send a mail with a recovery link." })
  @ApiNoContentResponse({ description: "Mail sent" })
  recoverAccountPassword(@Body() body: RecoverAccountPasswordDto) {
    return this.authService.recoverAccountPassword(body);
  }

  @Post("confirm-recover-password")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Confirm the recover password with token" })
  @ApiNoContentResponse({ description: "Password recovered" })
  confirmRecoverAccountPassword(
    @Body() body: ConfirmRecoverAccountPasswordDto
  ) {
    return this.authService.confirmRecoverAccountPassword(body);
  }

  @Post("refresh")
  @ApiOperation({ summary: "Refresh access token using refresh token" })
  refresh(@Body() body: RefreshTokenDto) {
    return this.authService.refreshToken(body);
  }

  @Protect()
  @Post("logout")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Logout user and invalidate refresh token" })
  @ApiNoContentResponse({ description: "Logged out successfully" })
  logout(@ConnectedUser() connectedUser: UserDocument) {
    return this.authService.logout(connectedUser);
  }
}
