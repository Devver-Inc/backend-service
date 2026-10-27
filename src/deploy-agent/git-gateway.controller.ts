import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { GitGatewayAuthorizeDto } from './_utils/dto/requests/git-gateway-authorize.dto';
import { GitGatewayTargetDto } from './_utils/dto/responses/git-gateway-target.dto';
import { GitGatewaySecretGuard } from './_utils/guards/git-gateway-secret.guard';
import { GitAuthorizationService } from './git-authorization.service';

@ApiTags('Git gateway')
@Controller('git-gateway')
export class GitGatewayController {
  constructor(
    private readonly gitAuthorizationService: GitAuthorizationService,
  ) {}

  @UseGuards(GitGatewaySecretGuard)
  @Post('authorize')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Authorize an SSH key for a project and return its agent target',
  })
  @ApiResponse({ status: HttpStatus.OK, type: GitGatewayTargetDto })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'UNKNOWN_SSH_KEY',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'SSH_KEY_OWNER_NOT_MEMBER',
  })
  authorize(@Body() dto: GitGatewayAuthorizeDto): Promise<GitGatewayTargetDto> {
    return this.gitAuthorizationService.authorizeGatewayKey(
      dto.projectId,
      dto.publicKey,
    );
  }
}
