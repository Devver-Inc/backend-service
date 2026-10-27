import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';

@Injectable()
export class DeployAgentExceptions {
  REPO_NOT_FOUND = new NotFoundException('REPO_NOT_FOUND');
  DEPLOYMENT_NOT_FOUND = new NotFoundException('DEPLOYMENT_NOT_FOUND');
  DATABASE_NOT_ENABLED = new BadRequestException('DATABASE_NOT_ENABLED');
  INVALID_SSH_KEY = new BadRequestException('INVALID_SSH_KEY');
  SSH_KEY_NOT_FOUND = new NotFoundException('SSH_KEY_NOT_FOUND');
  UNKNOWN_SSH_KEY = new UnauthorizedException('UNKNOWN_SSH_KEY');
  SSH_KEY_OWNER_NOT_MEMBER = new ForbiddenException('SSH_KEY_OWNER_NOT_MEMBER');
}
