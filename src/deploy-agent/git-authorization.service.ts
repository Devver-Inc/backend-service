import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { LogtoRequests } from 'src/logto/logto.requests';
import { ProjectDomain } from 'src/projects/project.domain';
import { ProjectsService } from 'src/projects/projects.service';
import { DeployAgentRepository } from './deploy-agent.repository';
import { SshKeysService } from './ssh-keys.service';

@Injectable()
export class GitAuthorizationService {
  constructor(
    private readonly deployAgentRepository: DeployAgentRepository,
    private readonly projectsService: ProjectsService,
    private readonly sshKeysService: SshKeysService,
    private readonly logtoRequests: LogtoRequests,
  ) {}

  /** Same rule as the API (ProjectDomain.canPush), with the user found by SSH key. */
  async authorizePush(
    projectId: string,
    repo: string,
    publicKey: string,
  ): Promise<void> {
    const userId = await this.sshKeysService.findOwner(publicKey);
    if (!userId) throw new UnauthorizedException('UNKNOWN_SSH_KEY');

    const project = await this.projectsService.findProjectById(projectId);
    const roles = await this.logtoRequests.getUserRoles(
      userId,
      project.organizationId,
    );
    if (
      !ProjectDomain.from(project).canPush(
        userId,
        roles.map((role) => role.name),
      )
    ) {
      throw new ForbiddenException('PUSH_NOT_ALLOWED');
    }
    await this.deployAgentRepository.findRepo(projectId, repo);
  }
}
