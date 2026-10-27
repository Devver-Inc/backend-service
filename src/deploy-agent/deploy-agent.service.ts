import {
  ForbiddenException,
  forwardRef,
  Inject,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';
import { VaultService } from 'src/_shared/vault/vault.service';
import { EnvironmentVariables } from 'src/_utils/config/env.config';
import {
  projectNamespace,
  vaultPaths,
} from 'src/_utils/functions/project-keys.function';
import { LogtoUserWithOrganizations } from 'src/logto/_utils/types/user-with-organization.type';
import { ProjectDomain } from 'src/projects/project.domain';
import { ProjectDocument } from 'src/projects/project.schema';
import { ProjectsService } from 'src/projects/projects.service';
import { CreateAgentDeploymentDto } from './_utils/dto/requests/create-deployment.dto';
import { CreateRepoDto } from './_utils/dto/requests/create-repo.dto';
import { GetAgentDeploymentDto } from './_utils/dto/responses/get-deployment.dto';
import { GetRepoDto } from './_utils/dto/responses/get-repo.dto';
import { deploymentIdentity } from './_utils/functions/deployment-identity.function';
import { lastSseEvent } from './_utils/functions/last-sse-event.function';
import { serviceNameOf } from './_utils/functions/service-name-of.function';
import {
  DeploymentAction,
  DeploymentStatus,
  ReconcileItem,
} from './_utils/types/agent.types';
import { DeployAgentMapper } from './deploy-agent.mapper';
import { DeployAgentRepository } from './deploy-agent.repository';
import { DeployAgentRequests } from './deploy-agent.requests';

const LOGS_TAIL = 200;

@Injectable()
export class DeployAgentService {
  private readonly previewDomain: string;

  constructor(
    private readonly deployAgentRepository: DeployAgentRepository,
    private readonly deployAgentRequests: DeployAgentRequests,
    private readonly deployAgentMapper: DeployAgentMapper,
    @Inject(forwardRef(() => ProjectsService))
    private readonly projectsService: ProjectsService,
    private readonly vault: VaultService,
    configService: ConfigService<EnvironmentVariables, true>,
  ) {
    this.previewDomain = `preview.${configService.get('DEPLOY_AGENT').K8S_BASE_DOMAIN}`;
  }

  getArgoAppName = async (
    projectId: string,
    user: LogtoUserWithOrganizations,
  ): Promise<string> => {
    await this.projectsService.assertProjectAccess(projectId, user);
    return projectNamespace(projectId);
  };

  isAgentHealthy = (projectId: string): Promise<boolean> =>
    this.deployAgentRequests.health(projectId);

  listRepos = async (
    projectId: string,
    user: LogtoUserWithOrganizations,
  ): Promise<GetRepoDto[]> => {
    await this.projectsService.assertProjectAccess(projectId, user);
    return this.deployAgentRepository
      .findReposByProject(projectId)
      .then((docs) => docs.map(this.deployAgentMapper.toRepoDto));
  };

  createRepo = async (
    projectId: string,
    dto: CreateRepoDto,
    user: LogtoUserWithOrganizations,
  ): Promise<GetRepoDto> => {
    const project = await this.assertCanPush(projectId, user);
    await this.deployAgentRequests.putRepo(projectId, dto.name);
    return this.deployAgentRepository
      .createRepo({
        projectId,
        organizationId: project.organizationId,
        name: dto.name,
      })
      .then(this.deployAgentMapper.toRepoDto);
  };

  deleteRepo = async (
    projectId: string,
    name: string,
    user: LogtoUserWithOrganizations,
  ): Promise<void> => {
    await this.projectsService.assertProjectAccess(projectId, user);
    await this.deployAgentRepository.findRepo(projectId, name);
    await this.deployAgentRequests.deleteRepo(projectId, name);
    const deployments = await this.deployAgentRepository.findDeployments({
      projectId,
      repo: name,
    });
    await Promise.all(
      deployments.map((d) =>
        this.vault.delete(vaultPaths.deployment(projectId, d.deploymentId)),
      ),
    );
    await this.deployAgentRepository.deleteDeployments({
      projectId,
      repo: name,
    });
    await this.deployAgentRepository.deleteRepo(projectId, name);
  };

  listDeployments = async (
    projectId: string,
    user: LogtoUserWithOrganizations,
    repo?: string,
  ): Promise<GetAgentDeploymentDto[]> => {
    await this.projectsService.assertProjectAccess(projectId, user);
    const [statuses, docs] = await Promise.all([
      this.deployAgentRequests.listDeployments(projectId),
      this.deployAgentRepository.findDeployments({ projectId }),
    ]);
    const byId = new Map(docs.map((doc) => [doc.deploymentId, doc]));
    return statuses
      .filter((status) => !repo || status.repo === repo)
      .map((status) =>
        this.deployAgentMapper.toAgentDeploymentDto(
          status,
          byId.get(status.id),
        ),
      );
  };

  getLogs = async (
    projectId: string,
    deploymentId: string,
    user: LogtoUserWithOrganizations,
  ): Promise<string> => {
    await this.projectsService.assertProjectAccess(projectId, user);
    return this.deployAgentRequests.getLogs(projectId, deploymentId, LOGS_TAIL);
  };

  control = async (
    projectId: string,
    deploymentId: string,
    action: DeploymentAction,
    user: LogtoUserWithOrganizations,
  ): Promise<void> => {
    await this.assertCanPush(projectId, user);
    await this.deployAgentRequests.control(projectId, deploymentId, action);
  };

  removeDeployment = async (
    projectId: string,
    deploymentId: string,
    user: LogtoUserWithOrganizations,
  ): Promise<void> => {
    await this.assertCanPush(projectId, user);
    await this.deployAgentRequests.deleteDeployment(projectId, deploymentId);
    await this.vault.delete(vaultPaths.deployment(projectId, deploymentId));
    await this.deployAgentRepository.deleteDeployment(projectId, deploymentId);
  };

  /**
   * Streams the agent's SSE (`phase`, then `done` or `failed`) to the client
   * unchanged. Errors before the agent's 200 surface as JSON 4xx/5xx. The
   * desired state is saved only on `done`, so a failed redeploy leaves the
   * previous one as what reconciliation replays. The upstream is read to the
   * end even if the client leaves, so a finished deploy is always recorded.
   */
  deploy = async (
    projectId: string,
    dto: CreateAgentDeploymentDto,
    user: LogtoUserWithOrganizations,
    response: Response,
  ): Promise<void> => {
    const project = await this.assertCanPush(projectId, user);
    await this.deployAgentRepository.findRepo(projectId, dto.repo);

    const serviceName = serviceNameOf(dto.service);
    const { id, host } = deploymentIdentity(
      projectId,
      dto.repo,
      dto.branch,
      serviceName,
      this.previewDomain,
    );
    const env = {
      ...dto.env,
      ...(dto.dbLinks?.length
        ? await this.projectsService.resolveDatabaseLinks(project, dto.dbLinks)
        : {}),
    };

    const upstream = await this.deployAgentRequests.putDeployment(
      projectId,
      id,
      {
        repo: dto.repo,
        ref: dto.commit ?? dto.branch,
        host,
        service: dto.service[serviceName] ?? {},
        env,
      },
    );

    response.status(200);
    response.setHeader('Content-Type', 'text/event-stream');
    response.setHeader('Cache-Control', 'no-cache, no-transform');
    response.setHeader('X-Accel-Buffering', 'no');
    response.flushHeaders();

    const send = (chunk: string | Uint8Array) => {
      if (!response.destroyed && !response.writableEnded) response.write(chunk);
    };

    let tail = '';
    try {
      const decoder = new TextDecoder();
      for await (const chunk of upstream.body as unknown as AsyncIterable<Uint8Array>) {
        send(chunk);
        tail = (tail + decoder.decode(chunk, { stream: true })).slice(-65_536);
      }
    } catch (err) {
      send(
        `event: failed\ndata: ${JSON.stringify({ code: 'AGENT_STREAM_ERROR', message: err instanceof Error ? err.message : 'Deploy agent stream broke' })}\n\n`,
      );
    }

    const last = lastSseEvent(tail);
    if (last?.event === 'done') {
      const status = last.data as DeploymentStatus;
      await this.vault.write(vaultPaths.deployment(projectId, id), env);
      await this.deployAgentRepository.upsertDeployment({
        projectId,
        organizationId: project.organizationId,
        repo: dto.repo,
        branch: dto.branch,
        serviceName,
        deploymentId: id,
        host,
        commit: status.commit,
        service: dto.service,
        dbLinks: dto.dbLinks,
      });
    }
    if (!response.writableEnded) response.end();
  };

  /** Desired state the agent replays at boot, pinned to the commits that were deployed. */
  listDesiredDeployments = async (
    projectId: string,
  ): Promise<ReconcileItem[]> => {
    const docs = await this.deployAgentRepository.findDeployments({
      projectId,
    });
    return Promise.all(
      docs.map(async (doc) => ({
        id: doc.deploymentId,
        repo: doc.repo,
        ref: doc.commit,
        host: doc.host,
        service: doc.service[doc.serviceName] ?? {},
        env:
          (await this.vault.read(
            vaultPaths.deployment(projectId, doc.deploymentId),
          )) ?? {},
      })),
    );
  };

  /** Called when a project goes away: its namespace (and agent) is deleted with it. */
  deleteProjectState = async (projectId: string): Promise<void> => {
    const deployments = await this.deployAgentRepository.findDeployments({
      projectId,
    });
    await Promise.all(
      deployments.map((d) =>
        this.vault.delete(vaultPaths.deployment(projectId, d.deploymentId)),
      ),
    );
    await this.deployAgentRepository.deleteDeployments({ projectId });
    await this.deployAgentRepository.deleteRepos({ projectId });
  };

  private assertCanPush = async (
    projectId: string,
    user: LogtoUserWithOrganizations,
  ): Promise<ProjectDocument> => {
    const project = await this.projectsService.assertProjectAccess(
      projectId,
      user,
    );
    const roles = user.selectedOrganizationRoles.map((role) => role.roleName);
    if (!ProjectDomain.from(project).canPush(user.id, roles)) {
      throw new ForbiddenException('PUSH_NOT_ALLOWED');
    }
    return project;
  };
}
