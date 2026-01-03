import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { FormDataRequest } from 'nestjs-form-data';
import { ConnectedUser } from 'src/logto/_utils/decorator/connected-user.decorator';
import { LogtoUser } from 'src/logto/_utils/types/responses/responses.type';
import { UpdateAccountDto } from './_utils/dto/requests/update-account.dto';
import { UsersService } from './users.service';
import { Protect } from 'src/_utils/decorators/protect.decorator';

@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Protect()
  @Post('/account')
  createAccountForUser(@ConnectedUser() connectedUser: LogtoUser) {
    return this.usersService.createAccount(connectedUser);
  }

  @Protect()
  @Patch('me')
  @FormDataRequest()
  @HttpCode(HttpStatus.NO_CONTENT)
  updateAccount(
    @ConnectedUser() connectedUser: LogtoUser,
    @Body() dto: UpdateAccountDto,
  ) {
    return this.usersService.updateAccount(connectedUser, dto);
  }
}
