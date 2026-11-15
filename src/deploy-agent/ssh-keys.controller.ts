import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Protect } from 'src/_utils/decorators/protect.decorator';
import { ConnectedUser } from 'src/logto/_utils/decorator/connected-user.decorator';
import { LogtoUser } from 'src/logto/_utils/types/responses/responses.type';
import { CreateSshKeyDto } from './_utils/dto/requests/create-ssh-key.dto';
import { GetSshKeyDto } from './_utils/dto/responses/get-ssh-key.dto';
import { SshKeysService } from './ssh-keys.service';

@ApiTags('SSH keys')
@Controller('users/me/ssh-keys')
export class SshKeysController {
  constructor(private readonly sshKeysService: SshKeysService) {}

  @Protect()
  @Get()
  @ApiOperation({ summary: 'List SSH keys used to push to deploy agents' })
  @ApiResponse({ status: HttpStatus.OK, type: [GetSshKeyDto] })
  list(@ConnectedUser() user: LogtoUser): Promise<GetSshKeyDto[]> {
    return this.sshKeysService.list(user.id);
  }

  @Protect()
  @Post()
  @ApiOperation({ summary: 'Add an SSH public key' })
  @ApiResponse({ status: HttpStatus.CREATED, type: GetSshKeyDto })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'INVALID_SSH_KEY',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'SSH_KEY_ALREADY_EXISTS',
  })
  add(
    @ConnectedUser() user: LogtoUser,
    @Body() dto: CreateSshKeyDto,
  ): Promise<GetSshKeyDto> {
    return this.sshKeysService.add(user.id, dto);
  }

  @Protect()
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove an SSH key' })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'SSH_KEY_NOT_FOUND',
  })
  remove(
    @ConnectedUser() user: LogtoUser,
    @Param('id') id: string,
  ): Promise<void> {
    return this.sshKeysService.remove(user.id, id);
  }
}
