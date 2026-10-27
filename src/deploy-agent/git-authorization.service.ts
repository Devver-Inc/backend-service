import { ForbiddenException, Injectable } from '@nestjs/common';
import { DeployAgentExceptions } from './_utils/errors/deploy-agent-exceptions';
import { toSlug } from 'src/_utils/functions/to-slug.function';
import { LogtoUserWithOrganizations } from 'src/logto/_utils/types/user-with-organization.type';
import { LogtoRequests } from 'src/logto/logto.requests';
import { GitGatewayTargetDto } from './_utils/dto/responses/git-gateway-target.dto';
import { ProjectDomain } from 'src/projects/project.domain';
import { ProjectsService } from 'src/projects/projects.service';
import { SshKeysService } from './ssh-keys.service';
import { GenerateGitTokenResult } from './_utils/types/git-authorization.types';
import { DeployAgentRepository } from './deploy-agent.repository';
import { GitTokenService } from './infrastructure/git-token.service';

@Injectable()
export class GitAuthorizationService {
  constructor(
    private readonly deployAgentRepository: DeployAgentRepository,
    private readonly projectsService: ProjectsService,
    private readonly gitTokenService: GitTokenService,
    private readonly sshKeysService: SshKeysService,
    private readonly exceptions: DeployAgentExceptions,
    private readonly logtoRequests: LogtoRequests,
  ) {}

  async generateToken(
    projectId: string,
    repo: string,
    user: LogtoUserWithOrganizations,
  ): Promise<GenerateGitTokenResult> {
    await this.projectsService.assertProjectAccess(projectId, user);
    const storedRepo = await this.deployAgentRepository.findRepo(
      projectId,
      repo,
    );
    const token = await this.gitTokenService.generateToken(
      projectId,
      repo,
      user.id,
    );
    return { token, pushUrl: storedRepo.pushUrl };
  }

  async authorize(
    projectId: string,
    repo: string,
    token: string,
  ): Promise<void> {
    const payload = await this.gitTokenService.verifyToken(token, projectId);
    if (payload.projectId !== projectId || payload.repo !== repo) {
      throw new ForbiddenException('Git token scope mismatch');
    }
    await this.deployAgentRepository.findRepo(projectId, repo);
  }

  async authorizeGatewayKey(
    projectId: string,
    publicKey: string,
  ): Promise<GitGatewayTargetDto> {
    const userId = await this.sshKeysService.findOwner(publicKey);
    if (!userId) throw this.exceptions.UNKNOWN_SSH_KEY;

    const project = await this.projectsService.findProjectById(projectId);
    if (!ProjectDomain.from(project).isTeamMember(userId)) {
      throw this.exceptions.SSH_KEY_OWNER_NOT_MEMBER;
    }

    const organization = await this.logtoRequests.fetchOrganizationInformations(
      project.organizationId,
    );
    return {
      organization: toSlug(organization.name),
      project: toSlug(project.name),
    };
  }
}
