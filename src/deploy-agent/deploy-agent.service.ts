import {
  BadRequestException,
  HttpException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';
import { EncryptionService } from 'src/_utils/encryption/encryption.service';
import { EnvironmentVariables } from 'src/_utils/config/env.config';
import { toSlug } from 'src/_utils/functions/to-slug.function';
import { LogtoUserWithOrganizations } from 'src/logto/_utils/types/user-with-organization.type';
import { ProjectsService } from 'src/projects/projects.service';
import { DatabaseType } from 'src/projects/project.types';
import { ControlPm2ProcessDto } from './_utils/dto/requests/control-pm2-process.dto';
import { CreateAgentDeploymentDto } from './_utils/dto/requests/create-deployment.dto';
import { CreateRepoDto } from './_utils/dto/requests/create-repo.dto';
import {
  ControlPm2ProcessResultDto,
  GetAgentDeploymentDto,
  GetLogsDto,
  RestoreResultDto,
} from './_utils/dto/responses/get-deployment.dto';
import { GetDatabaseDto } from './_utils/dto/responses/get-database.dto';
import { GetRepoDto } from './_utils/dto/responses/get-repo.dto';
import { DeployAgentExceptions } from './_utils/errors/deploy-agent-exceptions';
import {
  AgentErrorCode,
  DeployResponse,
  ErrorResponse,
} from './_utils/types/agent.types';
import {
  AgentDeploymentStatus,
  PreparedDeployment,
} from './_utils/types/deployment.types';
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
    const deployAgentConfig = configService.get('DEPLOY_AGENT');
    this.baseDomain = deployAgentConfig.K8S_BASE_DOMAIN;
  }

  private buildAgentUrl = (orgName: string, projectName: string): string =>
    `https://${toSlug(orgName)}.${toSlug(projectName)}.${this.baseDomain}`;

  private resolveDatabaseLinks = async (
    projectId: string,
    dto: CreateAgentDeploymentDto,
    user: LogtoUserWithOrganizations,
  ): Promise<Record<string, string>> => {
    if (!dto.dbLinks?.length) {
      return {};
    }

    const links = await this.projectsService.resolveDatabaseLinks(
      projectId,
      user.currentOrganization.name,
      dto.dbLinks,
    );
    if (!links) {
      throw this.exceptions.DATABASE_NOT_ENABLED;
    }
    return links;
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

  private prepareDeployment = async (
    projectId: string,
    dto: CreateAgentDeploymentDto,
    user: LogtoUserWithOrganizations,
  ): Promise<PreparedDeployment> => {
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

    return {
      agentUrl,
      argoAppName: `${toSlug(user.currentOrganization.name)}-${toSlug(project.name)}`,
      deployAgentBody: {
        repo: dto.repo,
        branch: dto.branch,
        commit: dto.commit,
        service: dto.service,
        env: mergedEnv,
        projectId,
        organizationId: user.currentOrganization.id,
        overlayAccessControl: project.overlayAccessControl,
      },
      mergedEnv,
    };
  };

  private persistSuccessfulDeployment = async (
    projectId: string,
    dto: CreateAgentDeploymentDto,
    user: LogtoUserWithOrganizations,
    prepared: PreparedDeployment,
    result: DeployResponse,
  ): Promise<void> => {
    const encryptedEnv = prepared.mergedEnv
      ? this.encryptionService.encryptRecord(prepared.mergedEnv)
      : undefined;

    await this.deployAgentRepository.upsertDeployment({
      projectId,
      organizationId: user.currentOrganization.id,
      repo: dto.repo,
      branch: dto.branch,
      deploymentId: result.deploymentId,
      commit: result.commit,
      argoAppName: prepared.argoAppName,
      service: dto.service,
      dbLinks: dto.dbLinks,
      env: encryptedEnv,
      status: AgentDeploymentStatus.DEPLOYED,
    });
  };

  private writeSseEvent(
    response: Response,
    event: 'phase' | 'complete' | 'error',
    data: unknown,
  ): void {
    if (response.destroyed || response.writableEnded) return;
    response.write(`event: ${event}\n`);
    response.write(`data: ${JSON.stringify(data)}\n\n`);
  }

  private toDeployStreamError(err: unknown): ErrorResponse {
    const response =
      err instanceof HttpException ? err.getResponse() : undefined;

    if (
      response &&
      typeof response === 'object' &&
      (response as Partial<ErrorResponse>).success === false
    ) {
      return response as ErrorResponse;
    }

    return {
      success: false,
      error: {
        code: AgentErrorCode.DEPLOY_ERROR,
        message:
          err instanceof Error ? err.message : 'Failed to stream deployment',
      },
      duration: 0,
    };
  }

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
    repo?: string,
  ): Promise<GetAgentDeploymentDto[]> => {
    await this.verifyProjectOwnership(projectId, user);
    const agentUrl = await this.getAgentUrl(
      projectId,
      user.currentOrganization.name,
    );
    return this.deployAgentRequests
      .listDeployments(agentUrl, repo)
      .then((items) => items.map(this.deployAgentMapper.toAgentDeploymentDto));
  };

  listDatabases = async (
    projectId: string,
    engine: DatabaseType,
    user: LogtoUserWithOrganizations,
  ): Promise<GetDatabaseDto[]> => {
    await this.verifyProjectOwnership(projectId, user);
    const project = await this.projectsService.findProjectById(projectId);

    if (
      !project.databaseConfigurations?.some(
        (configuration) =>
          configuration.type === engine && configuration.enabled,
      )
    ) {
      throw this.exceptions.DATABASE_NOT_ENABLED;
    }

    const agentUrl = this.buildAgentUrl(
      user.currentOrganization.name,
      project.name,
    );

    return this.deployAgentRequests.listDatabases(agentUrl, engine);
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

  private controlProcess = async (
    projectId: string,
    dto: ControlPm2ProcessDto,
    user: LogtoUserWithOrganizations,
    action: 'start' | 'stop' | 'restart',
  ): Promise<ControlPm2ProcessResultDto> => {
    await this.verifyProjectOwnership(projectId, user);
    const agentUrl = await this.getAgentUrl(
      projectId,
      user.currentOrganization.name,
    );
    return this.deployAgentRequests[`${action}Process`](agentUrl, dto.name);
  };

  startProcess = (
    projectId: string,
    dto: ControlPm2ProcessDto,
    user: LogtoUserWithOrganizations,
  ) => this.controlProcess(projectId, dto, user, 'start');

  stopProcess = (
    projectId: string,
    dto: ControlPm2ProcessDto,
    user: LogtoUserWithOrganizations,
  ) => this.controlProcess(projectId, dto, user, 'stop');

  restartProcess = (
    projectId: string,
    dto: ControlPm2ProcessDto,
    user: LogtoUserWithOrganizations,
  ) => this.controlProcess(projectId, dto, user, 'restart');

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
    const prepared = await this.prepareDeployment(projectId, dto, user);
    const result = await this.deployAgentRequests.deploy(
      prepared.agentUrl,
      prepared.deployAgentBody,
    );

    if (!result.success) {
      throw new BadRequestException(result);
    }

    await this.persistSuccessfulDeployment(
      projectId,
      dto,
      user,
      prepared,
      result,
    );

    return this.deployAgentMapper.toAgentDeploymentDto(result);
  };

  deployStream = async (
    projectId: string,
    dto: CreateAgentDeploymentDto,
    user: LogtoUserWithOrganizations,
    response: Response,
  ): Promise<void> => {
    const prepared = await this.prepareDeployment(projectId, dto, user);
    const abortController = new AbortController();

    response.on('close', () => {
      abortController.abort();
    });

    response.status(200);
    response.setHeader('Content-Type', 'text/event-stream');
    response.setHeader('Cache-Control', 'no-cache, no-transform');
    response.setHeader('Connection', 'keep-alive');
    response.setHeader('X-Accel-Buffering', 'no');
    response.flushHeaders();

    try {
      await this.deployAgentRequests.deployStream(
        prepared.agentUrl,
        prepared.deployAgentBody,
        {
          onPhase: (event) => this.writeSseEvent(response, 'phase', event),
          onComplete: async (event) => {
            await this.persistSuccessfulDeployment(
              projectId,
              dto,
              user,
              prepared,
              event,
            );
            this.writeSseEvent(response, 'complete', event);
          },
          onError: (event) => this.writeSseEvent(response, 'error', event),
        },
        abortController.signal,
      );
    } catch (err) {
      if (!response.destroyed && !response.writableEnded) {
        this.writeSseEvent(response, 'error', this.toDeployStreamError(err));
      }
    } finally {
      if (!response.destroyed && !response.writableEnded) {
        response.end();
      }
    }
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
