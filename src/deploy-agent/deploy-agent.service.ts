import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EnvironmentVariables } from 'src/_utils/config/env.config';
import { ProjectsService } from 'src/projects/projects.service';
import { CreateAgentDeploymentDto } from './_utils/dto/requests/create-deployment.dto';
import type { ServiceName, ServiceConfig } from './_utils/types/agent.types';
import { ControlPm2ProcessDto } from './_utils/dto/requests/control-pm2-process.dto';
import { CreateRepoDto } from './_utils/dto/requests/create-repo.dto';
import {
  ControlPm2ProcessResultDto,
  GetAgentDeploymentDto,
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

  listDeployments = (projectId: string): Promise<GetAgentDeploymentDto[]> =>
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

  startProcess = (
    projectId: string,
    orgName: string,
    dto: ControlPm2ProcessDto,
  ): Promise<ControlPm2ProcessResultDto> =>
    this.getAgentUrl(projectId, orgName).then((agentUrl) =>
      this.deployAgentRequests.startProcess(agentUrl, dto.name),
    );

  stopProcess = (
    projectId: string,
    orgName: string,
    dto: ControlPm2ProcessDto,
  ): Promise<ControlPm2ProcessResultDto> =>
    this.getAgentUrl(projectId, orgName).then((agentUrl) =>
      this.deployAgentRequests.stopProcess(agentUrl, dto.name),
    );

  restartProcess = (
    projectId: string,
    orgName: string,
    dto: ControlPm2ProcessDto,
  ): Promise<ControlPm2ProcessResultDto> =>
    this.getAgentUrl(projectId, orgName).then((agentUrl) =>
      this.deployAgentRequests.restartProcess(agentUrl, dto.name),
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
      baseUrl: agentUrl,
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
    dto: CreateAgentDeploymentDto,
  ): Promise<GetAgentDeploymentDto> => {
    const agentUrl = await this.getAgentUrl(projectId, orgName);

    const serviceEntries = (
      Object.entries(dto.services) as [ServiceName, ServiceConfig | undefined][]
    ).filter(
      (entry): entry is [ServiceName, ServiceConfig] => entry[1] != null,
    );

    if (serviceEntries.length === 0) {
      throw new BadRequestException(
        'At least one service (web or api) must be defined',
      );
    }

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

    for (const [serviceName, serviceConfig] of serviceEntries) {
      const result = await this.deployAgentRequests.deploy(agentUrl, {
        repo: dto.repo,
        branch: dto.branch,
        commit: dto.commit,
        service: { [serviceName]: serviceConfig },
        env: dto.env?.[serviceName],
      });

      if (!result.success) {
        await this.deployAgentRepository.upsertDeployment({
          ...deploymentData,
          status: DeploymentStatus.FAILED,
        });
        throw new BadRequestException(result);
      }
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
    deploymentId: string,
  ): Promise<void> => {
    const agentUrl = await this.getAgentUrl(projectId, orgName);
    await this.deployAgentRequests.removeDeployment(agentUrl, deploymentId);
    await this.deployAgentRepository.markDeploymentRemovedById(deploymentId);
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
        .createRepo(agentUrl, { name: repo.name, baseUrl: repo.pushUrl })
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
      const serviceEntries = (
        Object.entries(dep.services) as [
          ServiceName,
          ServiceConfig | undefined,
        ][]
      ).filter(
        (entry): entry is [ServiceName, ServiceConfig] => entry[1] != null,
      );

      let allSucceeded = true;
      for (const [serviceName, serviceConfig] of serviceEntries) {
        await this.deployAgentRequests
          .deploy(agentUrl, {
            repo: dep.repo,
            branch: dep.branch,
            commit: dep.commit,
            service: { [serviceName]: serviceConfig },
            env: dep.env?.[serviceName],
          })
          .then((result) => {
            if (!result.success) allSucceeded = false;
          })
          .catch(() => {
            allSucceeded = false;
          });
      }
      if (allSucceeded && serviceEntries.length > 0) restoredDeployments += 1;
    }

    return { restoredRepos, restoredDeployments };
  };
}
