import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EnvironmentVariables } from 'src/_utils/config/env.config';
import { ProjectsRepository } from 'src/projects/projects.repository';
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
    private readonly repository: DeployAgentRepository,
    private readonly requests: DeployAgentRequests,
    private readonly mapper: DeployAgentMapper,
    private readonly projectsRepository: ProjectsRepository,
    configService: ConfigService<EnvironmentVariables, true>,
  ) {
    this.baseDomain = configService.get('DEPLOY_AGENT').K8S_BASE_DOMAIN;
  }

  private toSlug(value: string): string {
    return value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }

  private buildAgentUrl = (orgName: string, projectName: string): string =>
    `https://${this.toSlug(orgName)}.${this.toSlug(projectName)}.${this.baseDomain}`;

  private async getAgentUrl(
    projectId: string,
    orgName: string,
  ): Promise<string> {
    const project = await this.projectsRepository.findById(projectId);
    return this.buildAgentUrl(orgName, project.name);
  }

  async createRepo(
    projectId: string,
    organizationId: string,
    orgName: string,
    dto: CreateRepoDto,
  ): Promise<GetRepoDto> {
    const agentUrl = await this.getAgentUrl(projectId, orgName);
    const agentRepo = await this.requests.createRepo(agentUrl, {
      name: dto.name,
    });
    const doc = await this.repository.createRepo({
      projectId,
      organizationId,
      name: agentRepo.name,
      pushUrl: agentRepo.pushUrl,
    });
    return this.mapper.toRepoDto(doc);
  }

  async deleteRepo(
    projectId: string,
    orgName: string,
    name: string,
  ): Promise<void> {
    await this.repository.findRepo(projectId, name);
    const agentUrl = await this.getAgentUrl(projectId, orgName);
    await this.requests.deleteRepo(agentUrl, name);
    await this.repository.markDeploymentsByRepoRemoved(projectId, name);
    await this.repository.deleteRepo(projectId, name);
  }

  async listRepos(projectId: string): Promise<GetRepoDto[]> {
    const docs = await this.repository.findReposByProject(projectId);
    return docs.map(this.mapper.toRepoDto);
  }

  async deploy(
    projectId: string,
    organizationId: string,
    orgName: string,
    dto: CreateDeploymentDto,
  ): Promise<GetDeploymentDto> {
    const agentUrl = await this.getAgentUrl(projectId, orgName);
    const result = await this.requests.deploy(agentUrl, dto);

    if (!result.success) {
      await this.repository.upsertDeployment({
        projectId,
        organizationId,
        repo: dto.repo,
        branch: dto.branch,
        commit: dto.commit,
        services: dto.services,
        links: dto.links,
        env: dto.env,
        status: DeploymentStatus.FAILED,
      });

      throw new BadRequestException(result);
    }

    const doc = await this.repository.upsertDeployment({
      projectId,
      organizationId,
      repo: dto.repo,
      branch: dto.branch,
      commit: dto.commit,
      services: dto.services,
      links: dto.links,
      env: dto.env,
      status: DeploymentStatus.DEPLOYED,
    });
    return this.mapper.toDeploymentDto(doc);
  }

  async listDeployments(projectId: string): Promise<GetDeploymentDto[]> {
    const docs = await this.repository.findDeploymentsByProject(projectId);
    return docs.map(this.mapper.toDeploymentDto);
  }

  async removeDeployment(
    projectId: string,
    orgName: string,
    repo: string,
    branch: string,
  ): Promise<void> {
    const agentUrl = await this.getAgentUrl(projectId, orgName);
    await this.requests.removeDeployment(agentUrl, repo, branch);
    await this.repository.markDeploymentRemoved(projectId, repo, branch);
  }

  async getLogs(
    projectId: string,
    orgName: string,
    deploymentId: string,
  ): Promise<GetLogsDto> {
    const agentUrl = await this.getAgentUrl(projectId, orgName);
    return this.requests.getLogs(agentUrl, deploymentId);
  }

  async restoreState(
    projectId: string,
    orgName: string,
  ): Promise<RestoreResultDto> {
    const agentUrl = await this.getAgentUrl(projectId, orgName);
    let restoredRepos = 0;
    let restoredDeployments = 0;

    const repos = await this.repository.findReposByProject(projectId);
    for (const repo of repos) {
      await this.requests.createRepo(agentUrl, { name: repo.name }).then(
        () => {
          restoredRepos += 1;
        },
        () => {},
      );
    }

    const deployments = await this.repository.findDeploymentsByProject(
      projectId,
      DeploymentStatus.DEPLOYED,
    );
    for (const dep of deployments) {
      await this.requests
        .deploy(agentUrl, {
          repo: dep.repo,
          branch: dep.branch,
          commit: dep.commit,
          services: dep.services,
          links: dep.links,
          env: dep.env,
        })
        .then(
          (result) => {
            if (result.success) {
              restoredDeployments += 1;
            }
          },
          () => {},
        );
    }

    return {
      restoredRepos,
      restoredDeployments,
    };
  }
}
