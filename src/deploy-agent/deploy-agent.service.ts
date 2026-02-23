import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EnvironmentVariables } from 'src/_utils/config/env.config';
import { ProjectsService } from 'src/projects/projects.service';
import { CreateDeploymentDto } from './_utils/dto/requests/create-deployment.dto';
import { CreateRepoDto } from './_utils/dto/requests/create-repo.dto';
import {
  GetDeploymentDto,
  GetLogsDto,
  RestoreResultDto,
} from './_utils/dto/responses/get-deployment.dto';
import { GetRepoDto } from './_utils/dto/responses/get-repo.dto';
import { DeployAgentMapper } from './deploy-agent.mapper';
import { DeployAgentRepository } from './deploy-agent.repository';
import { DeployAgentRequests } from './deploy-agent.requests';
import { DeploymentStatus } from './_utils/types/deployment.types';

@Injectable()
export class DeployAgentService {
  private readonly baseDomain: string;

  constructor(
    private readonly deployAgentRepository: DeployAgentRepository,
    private readonly deployAgentRequests: DeployAgentRequests,
    private readonly deployAgentMapper: DeployAgentMapper,
    private readonly projectsService: ProjectsService,
    configService: ConfigService<EnvironmentVariables, true>,
  ) {
    this.baseDomain = configService.get('DEPLOY_AGENT').K8S_BASE_DOMAIN;
  }

  private toSlug = (value: string): string =>
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

  private buildAgentUrl = (orgName: string, projectName: string): string =>
    `https://${this.toSlug(orgName)}.${this.toSlug(projectName)}.${this.baseDomain}`;

  private getAgentUrl = (projectId: string, orgName: string): Promise<string> =>
    this.projectsService
      .findProjectById(projectId)
      .then((project) => this.buildAgentUrl(orgName, project.name));

  listRepos = (projectId: string): Promise<GetRepoDto[]> =>
    this.deployAgentRepository
      .findReposByProject(projectId)
      .then((docs) => docs.map(this.deployAgentMapper.toRepoDto));

  listDeployments = (projectId: string): Promise<GetDeploymentDto[]> =>
    this.deployAgentRepository
      .findDeploymentsByProject(projectId)
      .then((docs) => docs.map(this.deployAgentMapper.toDeploymentDto));

  getLogs = (
    projectId: string,
    orgName: string,
    deploymentId: string,
  ): Promise<GetLogsDto> =>
    this.getAgentUrl(projectId, orgName).then((agentUrl) =>
      this.deployAgentRequests.getLogs(agentUrl, deploymentId),
    );

  createRepo = async (
    projectId: string,
    organizationId: string,
    orgName: string,
    dto: CreateRepoDto,
  ): Promise<GetRepoDto> => {
    const agentUrl = await this.getAgentUrl(projectId, orgName);
    const agentRepo = await this.deployAgentRequests.createRepo(agentUrl, {
      name: dto.name,
    });
    return this.deployAgentRepository
      .createRepo({
        projectId,
        organizationId,
        name: agentRepo.name,
        pushUrl: agentRepo.pushUrl,
      })
      .then(this.deployAgentMapper.toRepoDto);
  };

  deleteRepo = async (
    projectId: string,
    orgName: string,
    name: string,
  ): Promise<void> => {
    await this.deployAgentRepository.findRepo(projectId, name);
    const agentUrl = await this.getAgentUrl(projectId, orgName);
    await this.deployAgentRequests.deleteRepo(agentUrl, name);
    await this.deployAgentRepository.markDeploymentsByRepoRemoved(
      projectId,
      name,
    );
    await this.deployAgentRepository.deleteRepo(projectId, name);
  };

  deploy = async (
    projectId: string,
    organizationId: string,
    orgName: string,
    dto: CreateDeploymentDto,
  ): Promise<GetDeploymentDto> => {
    const agentUrl = await this.getAgentUrl(projectId, orgName);
    const result = await this.deployAgentRequests.deploy(agentUrl, dto);

    const deploymentData = {
      projectId,
      organizationId,
      repo: dto.repo,
      branch: dto.branch,
      commit: dto.commit,
      services: dto.services,
      links: dto.links,
      env: dto.env,
    };

    if (!result.success) {
      await this.deployAgentRepository.upsertDeployment({
        ...deploymentData,
        status: DeploymentStatus.FAILED,
      });
      throw new BadRequestException(result);
    }

    return this.deployAgentRepository
      .upsertDeployment({
        ...deploymentData,
        status: DeploymentStatus.DEPLOYED,
      })
      .then(this.deployAgentMapper.toDeploymentDto);
  };

  removeDeployment = async (
    projectId: string,
    orgName: string,
    repo: string,
    branch: string,
  ): Promise<void> => {
    const agentUrl = await this.getAgentUrl(projectId, orgName);
    await this.deployAgentRequests.removeDeployment(agentUrl, repo, branch);
    await this.deployAgentRepository.markDeploymentRemoved(
      projectId,
      repo,
      branch,
    );
  };

  restoreState = async (
    projectId: string,
    orgName: string,
  ): Promise<RestoreResultDto> => {
    const agentUrl = await this.getAgentUrl(projectId, orgName);
    let restoredRepos = 0;
    let restoredDeployments = 0;

    const repos =
      await this.deployAgentRepository.findReposByProject(projectId);
    for (const repo of repos) {
      await this.deployAgentRequests
        .createRepo(agentUrl, { name: repo.name })
        .then(() => {
          restoredRepos += 1;
        })
        .catch(() => {});
    }

    const deployments =
      await this.deployAgentRepository.findDeploymentsByProject(
        projectId,
        DeploymentStatus.DEPLOYED,
      );
    for (const dep of deployments) {
      await this.deployAgentRequests
        .deploy(agentUrl, {
          repo: dep.repo,
          branch: dep.branch,
          commit: dep.commit,
          services: dep.services,
          links: dep.links,
          env: dep.env,
        })
        .then((result) => {
          if (result.success) restoredDeployments += 1;
        })
        .catch(() => {});
    }

    return { restoredRepos, restoredDeployments };
  };
}
