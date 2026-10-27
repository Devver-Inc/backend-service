import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Public } from 'src/logto/_utils/decorator/public.decorator';
import { GitGatewayAuthorizeDto } from './_utils/dto/requests/git-gateway-authorize.dto';
import { GitGatewaySecretGuard } from './_utils/guards/git-gateway-secret.guard';
import { GitAuthorizationService } from './git-authorization.service';

@Public()
@ApiTags('Git gateway')
@Controller('git-gateway')
export class GitGatewayController {
  constructor(
    private readonly gitAuthorizationService: GitAuthorizationService,
  ) {}

  @UseGuards(GitGatewaySecretGuard)
  @Post('authorize')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary:
      'Allow or deny an SSH push; the gateway routes to the project agent itself',
  })
  @ApiResponse({ status: HttpStatus.NO_CONTENT, description: 'Push allowed' })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'UNKNOWN_SSH_KEY',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'PUSH_NOT_ALLOWED',
  })
  authorize(@Body() dto: GitGatewayAuthorizeDto): Promise<void> {
    return this.gitAuthorizationService.authorizePush(
      dto.projectId,
      dto.publicKey,
    );
  }
}
