import {
  Body,
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { FormDataRequest } from 'nestjs-form-data';
import { ConnectedUser } from 'src/logto/_utils/decorator/connected-user.decorator';
import { LogtoUser } from 'src/logto/_utils/types/responses/responses.type';
import { UpdateAccountDto } from './_utils/dto/requests/update-account.dto';
import { UpdateProfilePictureDto } from './_utils/dto/requests/update-profile-picture.dto';
import { UsersService } from './users.service';
import { Protect } from 'src/_utils/decorators/protect.decorator';

@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Protect()
  @Post('/account')
  @ApiOperation({ summary: 'Create account for current user' })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'UNAUTHORIZED' })
  createAccountForUser(@ConnectedUser() user: LogtoUser) {
    return this.usersService.createAccount(user);
  }

  @Protect()
  @Patch('me')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Update current user account' })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'UNAUTHORIZED' })
  updateAccount(
    @ConnectedUser() user: LogtoUser,
    @Body() dto: UpdateAccountDto,
  ) {
    return this.usersService.updateAccount(user, dto);
  }

  @Protect()
  @Post('me/picture')
  @FormDataRequest()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Upload profile picture for current user' })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'UNAUTHORIZED' })
  uploadProfilePicture(
    @ConnectedUser() user: LogtoUser,
    @Body() dto: UpdateProfilePictureDto,
  ) {
    return this.usersService.uploadProfilePicture(user, dto);
  }

  @Protect()
  @Delete('me/picture')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete profile picture for current user' })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'UNAUTHORIZED' })
  deleteProfilePicture(@ConnectedUser() user: LogtoUser) {
    return this.usersService.deleteProfilePicture(user);
  }
}
