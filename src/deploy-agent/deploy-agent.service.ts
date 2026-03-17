import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EnvironmentVariables } from 'src/_utils/config/env.config';
import { toSlug } from 'src/_utils/functions/to-slug.function';
import { LogtoUserWithOrganizations } from 'src/logto/_utils/types/user-with-organization.type';
import { ProjectsService } from 'src/projects/projects.service';
import { ControlPm2ProcessDto } from './_utils/dto/requests/control-pm2-process.dto';
import { CreateAgentDeploymentDto } from './_utils/dto/requests/create-deployment.dto';
import { CreateRepoDto } from './_utils/dto/requests/create-repo.dto';
import {
  ControlPm2ProcessResultDto,
  GetAgentDeploymentDto,
  GetLogsDto,
  RestoreResultDto,
} from './_utils/dto/responses/get-deployment.dto';
import { GetRepoDto } from './_utils/dto/responses/get-repo.dto';
import { DeployAgentExceptions } from './_utils/errors/deploy-agent-exceptions';
import { AgentDeploymentStatus } from './_utils/types/deployment.types';
import { DeployAgentMapper } from './deploy-agent.mapper';
import { DeployAgentRepository } from './deploy-agent.repository';
import { DeployAgentRequests } from './deploy-agent.requests';

@Injectable()
export class DeployAgentService {
  private readonly logger = new Logger(DeployAgentService.name);
  private readonly baseDomain: string;

  constructor(
    private readonly deployAgentRepository: DeployAgentRepository,
    private readonly deployAgentRequests: DeployAgentRequests,
    private readonly deployAgentMapper: DeployAgentMapper,
    private readonly projectsService: ProjectsService,
    private readonly exceptions: DeployAgentExceptions,
    configService: ConfigService<EnvironmentVariables, true>,
  ) {
    this.baseDomain = configService.get('DEPLOY_AGENT').K8S_BASE_DOMAIN;
  }

  private buildAgentUrl = (orgName: string, projectName: string): string =>
    `https://${toSlug(orgName)}.${toSlug(projectName)}.${this.baseDomain}`;

  private getAgentUrl = (projectId: string, orgName: string): Promise<string> =>
    this.projectsService
      .findProjectById(projectId)
      .then((project) => this.buildAgentUrl(orgName, project.name));

  private verifyProjectOwnership = async (
    projectId: string,
    user: LogtoUserWithOrganizations,
  ): Promise<void> => {
    const project = await this.projectsService.findProjectById(projectId);
    if (project.organizationId !== user.currentOrganization.id) {
      throw this.exceptions.PROJECT_ACCESS_DENIED;
    }
    if (!user.isAdmin && !project.teamMemberIds.includes(user.id)) {
      throw this.exceptions.PROJECT_ACCESS_DENIED;
    }
  };

  listRepos = async (
    projectId: string,
    user: LogtoUserWithOrganizations,
  ): Promise<GetRepoDto[]> => {
    await this.verifyProjectOwnership(projectId, user);
    return this.deployAgentRepository
      .findReposByProject(projectId)
      .then((docs) => docs.map(this.deployAgentMapper.toRepoDto));
  };

  listDeployments = async (
    projectId: string,
    user: LogtoUserWithOrganizations,
  ): Promise<GetAgentDeploymentDto[]> => {
    await this.verifyProjectOwnership(projectId, user);
    const agentUrl = await this.getAgentUrl(
      projectId,
      user.currentOrganization.name,
    );
    return this.deployAgentRequests
      .listDeployments(agentUrl)
      .then((items) => items.map(this.deployAgentMapper.toAgentDeploymentDto));
  };

  getLogs = async (
    projectId: string,
    deploymentId: string,
    user: LogtoUserWithOrganizations,
  ): Promise<GetLogsDto> => {
    await this.verifyProjectOwnership(projectId, user);
    const agentUrl = await this.getAgentUrl(
      projectId,
      user.currentOrganization.name,
    );
    return this.deployAgentRequests.getLogs(agentUrl, deploymentId);
  };

  startProcess = async (
    projectId: string,
    dto: ControlPm2ProcessDto,
    user: LogtoUserWithOrganizations,
  ): Promise<ControlPm2ProcessResultDto> => {
    await this.verifyProjectOwnership(projectId, user);
    const agentUrl = await this.getAgentUrl(
      projectId,
      user.currentOrganization.name,
    );
    return this.deployAgentRequests.startProcess(agentUrl, dto.name);
  };

  stopProcess = async (
    projectId: string,
    dto: ControlPm2ProcessDto,
    user: LogtoUserWithOrganizations,
  ): Promise<ControlPm2ProcessResultDto> => {
    await this.verifyProjectOwnership(projectId, user);
    const agentUrl = await this.getAgentUrl(
      projectId,
      user.currentOrganization.name,
    );
    return this.deployAgentRequests.stopProcess(agentUrl, dto.name);
  };

  restartProcess = async (
    projectId: string,
    dto: ControlPm2ProcessDto,
    user: LogtoUserWithOrganizations,
  ): Promise<ControlPm2ProcessResultDto> => {
    await this.verifyProjectOwnership(projectId, user);
    const agentUrl = await this.getAgentUrl(
      projectId,
      user.currentOrganization.name,
    );
    return this.deployAgentRequests.restartProcess(agentUrl, dto.name);
  };

  createRepo = async (
    projectId: string,
    dto: CreateRepoDto,
    user: LogtoUserWithOrganizations,
  ): Promise<GetRepoDto> => {
    await this.verifyProjectOwnership(projectId, user);
    const agentUrl = await this.getAgentUrl(
      projectId,
      user.currentOrganization.name,
    );
    const agentRepo = await this.deployAgentRequests.createRepo(agentUrl, {
      name: dto.name,
      baseUrl: agentUrl,
    });

    return this.deployAgentRepository
      .createRepo({
        projectId,
        organizationId: user.currentOrganization.id,
        name: agentRepo.name,
        pushUrl: agentRepo.pushUrl,
      })
      .then(this.deployAgentMapper.toRepoDto);
  };

  deleteRepo = async (
    projectId: string,
    name: string,
    user: LogtoUserWithOrganizations,
  ): Promise<void> => {
    await this.verifyProjectOwnership(projectId, user);
    await this.deployAgentRepository.findRepo(projectId, name);
    const agentUrl = await this.getAgentUrl(
      projectId,
      user.currentOrganization.name,
    );
    await this.deployAgentRequests.deleteRepo(agentUrl, name);
    await this.deployAgentRepository.markDeploymentsByRepoRemoved(
      projectId,
      name,
    );
    await this.deployAgentRepository.deleteRepo(projectId, name);
  };

  deploy = async (
    projectId: string,
    dto: CreateAgentDeploymentDto,
    user: LogtoUserWithOrganizations,
  ): Promise<GetAgentDeploymentDto> => {
    await this.verifyProjectOwnership(projectId, user);
    const agentUrl = await this.getAgentUrl(
      projectId,
      user.currentOrganization.name,
    );

    const result = await this.deployAgentRequests.deploy(agentUrl, {
      repo: dto.repo,
      branch: dto.branch,
      commit: dto.commit,
      service: dto.service,
      env: dto.env,
    });

    if (!result.success) {
      throw new BadRequestException(result);
    }

    await this.deployAgentRepository.upsertDeployment({
      projectId,
      organizationId: user.currentOrganization.id,
      repo: dto.repo,
      branch: dto.branch,
      deploymentId: result.deploymentId,
      commit: dto.commit,
      service: dto.service,
      links: dto.links,
      env: dto.env,
      status: AgentDeploymentStatus.DEPLOYED,
    });

    return this.deployAgentMapper.toAgentDeploymentDto(result);
  };

  removeDeployment = async (
    projectId: string,
    deploymentId: string,
    user: LogtoUserWithOrganizations,
  ): Promise<void> => {
    await this.verifyProjectOwnership(projectId, user);
    const agentUrl = await this.getAgentUrl(
      projectId,
      user.currentOrganization.name,
    );
    await this.deployAgentRequests.removeDeployment(agentUrl, deploymentId);
    await this.deployAgentRepository.markDeploymentRemovedByDeploymentId(
      deploymentId,
    );
  };

  restoreState = async (
    projectId: string,
    user: LogtoUserWithOrganizations,
  ): Promise<RestoreResultDto> => {
    await this.verifyProjectOwnership(projectId, user);
    const agentUrl = await this.getAgentUrl(
      projectId,
      user.currentOrganization.name,
    );
    let restoredRepos = 0;
    let restoredDeployments = 0;

    const repos =
      await this.deployAgentRepository.findReposByProject(projectId);
    for (const repo of repos) {
      await this.deployAgentRequests
        .createRepo(agentUrl, { name: repo.name, baseUrl: repo.pushUrl })
        .then(() => {
          restoredRepos += 1;
        })
        .catch((err: unknown) => {
          this.logger.warn(
            `Failed to restore repo "${repo.name}": ${err instanceof Error ? err.message : String(err)}`,
          );
        });
    }

    const deployments =
      await this.deployAgentRepository.findDeploymentsByProject(
        projectId,
        AgentDeploymentStatus.DEPLOYED,
      );
    for (const dep of deployments) {
      await this.deployAgentRequests
        .deploy(agentUrl, {
          repo: dep.repo,
          branch: dep.branch,
          commit: dep.commit,
          service: dep.service,
          env: dep.env,
        })
        .then((result) => {
          if (result.success) restoredDeployments += 1;
        })
        .catch((err: unknown) => {
          this.logger.warn(
            `Failed to restore deployment "${dep.deploymentId}": ${err instanceof Error ? err.message : String(err)}`,
          );
        });
    }

    return { restoredRepos, restoredDeployments };
  };
}
