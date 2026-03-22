import { Injectable, NotFoundException } from '@nestjs/common';

@Injectable()
export class DeployAgentExceptions {
  REPO_NOT_FOUND = new NotFoundException('REPO_NOT_FOUND');
  DEPLOYMENT_NOT_FOUND = new NotFoundException('DEPLOYMENT_NOT_FOUND');
}
