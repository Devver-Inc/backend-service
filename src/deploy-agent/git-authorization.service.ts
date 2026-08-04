import { ForbiddenException, Injectable } from '@nestjs/common';
import { LogtoUserWithOrganizations } from 'src/logto/_utils/types/user-with-organization.type';
import { ProjectsService } from 'src/projects/projects.service';
import { GenerateGitTokenResult } from './_utils/types/git-authorization.types';
import { DeployAgentRepository } from './deploy-agent.repository';
import { GitTokenService } from './infrastructure/git-token.service';

@Injectable()
export class GitAuthorizationService {
  constructor(
    private readonly deployAgentRepository: DeployAgentRepository,
    private readonly projectsService: ProjectsService,
    private readonly gitTokenService: GitTokenService,
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
}
