import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

@Injectable()
export class DeployAgentExceptions {
  PROJECT_ACCESS_DENIED = new ForbiddenException('PROJECT_ACCESS_DENIED');
  REPO_NOT_FOUND = new NotFoundException('REPO_NOT_FOUND');
  DEPLOYMENT_NOT_FOUND = new NotFoundException('DEPLOYMENT_NOT_FOUND');
}
