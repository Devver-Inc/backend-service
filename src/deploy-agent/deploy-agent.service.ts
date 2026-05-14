import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EncryptionService } from 'src/_utils/encryption/encryption.service';
import { EnvironmentVariables } from 'src/_utils/config/env.config';
import { toSlug } from 'src/_utils/functions/to-slug.function';
import { LogtoUserWithOrganizations } from 'src/logto/_utils/types/user-with-organization.type';
import { ProjectDomain } from 'src/projects/project.domain';
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
import { GetMongoDatabaseDto } from './_utils/dto/responses/get-mongo-database.dto';
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
    private readonly encryptionService: EncryptionService,
    private readonly exceptions: DeployAgentExceptions,
    configService: ConfigService<EnvironmentVariables, true>,
  ) {
    this.baseDomain = configService.get('DEPLOY_AGENT').K8S_BASE_DOMAIN;
  }

  private buildAgentUrl = (orgName: string, projectName: string): string =>
    `https://${toSlug(orgName)}.${toSlug(projectName)}.${this.baseDomain}`;

  private resolveDatabaseLinks = async (
    projectId: string,
    dto: CreateAgentDeploymentDto,
    user: LogtoUserWithOrganizations,
  ): Promise<Record<string, string>> => {
    if (!dto.dbLinks || Object.keys(dto.dbLinks).length === 0) {
      return {};
    }

    const project = await this.projectsService.findProjectById(projectId);
    if (!project.databaseConfiguration?.enabled) {
      throw this.exceptions.DATABASE_NOT_ENABLED;
    }

    const rootPassword = this.encryptionService.decryptString(
      project.databaseConfiguration.rootPasswordEncrypted,
    );

    const projectDomain = ProjectDomain.fromDocument(project);
    const envLinks: Record<string, string> = {};
    for (const [envKey, databaseName] of Object.entries(dto.dbLinks)) {
      envLinks[envKey] = projectDomain.buildDatabaseConnectionString(
        user.currentOrganization.name,
        rootPassword,
        databaseName,
      );
    }

    return envLinks;
  };

  private getAgentUrl = (projectId: string, orgName: string): Promise<string> =>
    this.projectsService
      .findProjectById(projectId)
      .then((project) => this.buildAgentUrl(orgName, project.name));

  private verifyProjectOwnership = async (
    projectId: string,
    user: LogtoUserWithOrganizations,
  ): Promise<void> => {
    await this.projectsService.assertProjectAccess(projectId, user);
  };

  assertProjectAccess = (
    projectId: string,
    user: LogtoUserWithOrganizations,
  ): Promise<void> => this.verifyProjectOwnership(projectId, user);

  getArgoAppName = async (
    projectId: string,
    user: LogtoUserWithOrganizations,
  ): Promise<string> => {
    await this.verifyProjectOwnership(projectId, user);
    const stored =
      await this.deployAgentRepository.findArgoAppNameByProject(projectId);
    if (stored) return stored;
    const project = await this.projectsService.findProjectById(projectId);
    return `${toSlug(user.currentOrganization.name)}-${toSlug(project.name)}`;
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

  listMongoDatabases = async (
    projectId: string,
    user: LogtoUserWithOrganizations,
  ): Promise<GetMongoDatabaseDto[]> => {
    await this.verifyProjectOwnership(projectId, user);
    const project = await this.projectsService.findProjectById(projectId);

    if (!project.databaseConfiguration?.enabled) {
      throw this.exceptions.DATABASE_NOT_ENABLED;
    }

    const agentUrl = this.buildAgentUrl(
      user.currentOrganization.name,
      project.name,
    );

    return this.deployAgentRequests.listMongoDatabases(agentUrl);
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
    const project = await this.projectsService.findProjectById(projectId);
    const agentUrl = this.buildAgentUrl(
      user.currentOrganization.name,
      project.name,
    );
    const databaseEnv = await this.resolveDatabaseLinks(projectId, dto, user);
    const mergedEnv =
      dto.env || Object.keys(databaseEnv).length > 0
        ? { ...dto.env, ...databaseEnv }
        : undefined;

    const deployAgentBody = {
      repo: dto.repo,
      branch: dto.branch,
      commit: dto.commit,
      service: dto.service,
      env: mergedEnv,
      projectId,
      organizationId: user.currentOrganization.id,
      overlayAccessControl: project.overlayAccessControl,
    };

    const result = await this.deployAgentRequests.deploy(
      agentUrl,
      deployAgentBody,
    );

    if (!result.success) {
      throw new BadRequestException(result);
    }

    const encryptedEnv = mergedEnv
      ? this.encryptionService.encryptRecord(mergedEnv)
      : undefined;

    const argoAppName = `${toSlug(user.currentOrganization.name)}-${toSlug(project.name)}`;

    await this.deployAgentRepository.upsertDeployment({
      projectId,
      organizationId: user.currentOrganization.id,
      repo: dto.repo,
      branch: dto.branch,
      deploymentId: result.deploymentId,
      commit: dto.commit,
      argoAppName,
      service: dto.service,
      links: dto.links,
      dbLinks: dto.dbLinks,
      env: encryptedEnv,
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
    const project = await this.projectsService.findProjectById(projectId);
    const agentUrl = this.buildAgentUrl(
      user.currentOrganization.name,
      project.name,
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
      const plainEnv = dep.env
        ? this.encryptionService.decryptRecord(dep.env)
        : undefined;
      await this.deployAgentRequests
        .deploy(agentUrl, {
          repo: dep.repo,
          branch: dep.branch,
          commit: dep.commit,
          service: dep.service,
          env: plainEnv,
          projectId,
          organizationId: user.currentOrganization.id,
          overlayAccessControl: project.overlayAccessControl,
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
