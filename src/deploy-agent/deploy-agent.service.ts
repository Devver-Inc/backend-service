import { isDeepStrictEqual } from 'node:util';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  forwardRef,
  Inject,
  Injectable,
  NotFoundException,
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
import { InitProjectDto } from './_utils/dto/requests/init-project.dto';
import { MergeDeploymentsDto } from './_utils/dto/requests/merge-deployments.dto';
import { GetAgentDeploymentDto } from './_utils/dto/responses/get-deployment.dto';
import { InitProjectResponseDto } from './_utils/dto/responses/init-project-response.dto';
import { deploymentIdentity } from './_utils/functions/deployment-identity.function';
import { escapeRegex } from 'src/_utils/functions/escape-regex.function';
import { branchHost } from './_utils/functions/branch-host.function';
import { failedStage } from './_utils/functions/failed-stage.function';
import { lastSseEvent } from './_utils/functions/last-sse-event.function';
import { serviceNameOf } from './_utils/functions/service-name-of.function';
import {
  DeploymentAction,
  ReconcileItem,
  ServiceConfig,
  ServiceName,
} from './_utils/types/agent.types';
import { NewDeploymentData } from './_utils/types/deployment.types';
import { DeployAgentMapper } from './deploy-agent.mapper';
import {
  DeployAgentRepository,
  DeploymentLean,
} from './deploy-agent.repository';
import { DeployAgentRequests } from './deploy-agent.requests';

const LOGS_TAIL = 200;

// Records from before `deployedAt` existed fall back to their creation.
const deployedAt = (d: DeploymentLean): number =>
  new Date(d.deployedAt ?? d.createdAt).getTime();

// Mongo stores the DTO's unset fields as null; the agent accepts only strings.
const agentServiceSpec = (config?: ServiceConfig): ServiceConfig =>
  Object.fromEntries(
    Object.entries(config ?? {}).filter(([, value]) => value != null),
  );

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

  /**
   * `devver init`: the repo is named after the code's root commit, so every
   * clone and every init of the same code lands in the same repo.
   */
  initProject = async (
    projectId: string,
    dto: InitProjectDto,
    user: LogtoUserWithOrganizations,
  ): Promise<InitProjectResponseDto> => {
    await this.assertCanPush(projectId, user);
    await this.deployAgentRequests.putRepo(projectId, dto.rootCommit, {
      install: dto.install,
    });
    return this.deployAgentMapper.toInitResponse(projectId, dto.rootCommit);
  };

  listDeployments = async (
    projectId: string,
    user: LogtoUserWithOrganizations,
    rootCommit?: string,
  ): Promise<GetAgentDeploymentDto[]> => {
    await this.projectsService.assertProjectAccess(projectId, user);
    const [processes, docs] = await Promise.all([
      this.deployAgentRequests.listDeployments(projectId),
      this.deployAgentRepository.findDeployments({ projectId }),
    ]);
    const byId = new Map(processes.map((p) => [p.id, p]));
    const aliases = this.branchAliases(
      projectId,
      docs.filter((d) => d.status === 'ready'),
    );
    return docs
      .filter((doc) => !rootCommit || doc.repo === rootCommit)
      .map((doc) =>
        this.deployAgentMapper.toAgentDeploymentDto(
          doc,
          byId.get(doc.deploymentId),
          aliases.get(doc.deploymentId)?.[0],
        ),
      );
  };

  renameDeployment = async (
    projectId: string,
    deploymentId: string,
    displayName: string,
    user: LogtoUserWithOrganizations,
  ): Promise<{ displayName: string }> => {
    await this.assertCanPush(projectId, user);
    await this.deployAgentRepository.renameDeployment(
      projectId,
      deploymentId,
      displayName,
    );
    return { displayName };
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
   * Deployment id → its branch URL, for the latest ready deployment of each
   * branch and service. Removing that deployment leaves its URL down until
   * the branch's next deploy.
   */
  branchAliases = (
    projectId: string,
    ready: DeploymentLean[],
  ): Map<string, string[]> => {
    const latest = new Map<string, DeploymentLean>();
    for (const d of ready) {
      if (!d.branch) continue;
      const host = this.branchHostOf(projectId, d.branch, d.serviceName);
      const current = latest.get(host);
      if (!current || deployedAt(d) >= deployedAt(current)) latest.set(host, d);
    }
    return new Map([...latest].map(([host, d]) => [d.deploymentId, [host]]));
  };

  private branchHostOf = (
    projectId: string,
    branch: string,
    service: ServiceName,
  ): string => branchHost(branch, service, projectId, this.previewDomain);

  /** What the agent passes to a deployment's processes: its env plus what the platform adds. */
  private agentEnv = (
    projectId: string,
    env: Record<string, string>,
  ): Record<string, string> => ({
    ...env,
    // Lets an API allow every preview of its project in CORS, whatever their URLs.
    DEVVER_PREVIEW_ORIGIN_REGEX: `^https://[a-z0-9-]+--${projectId}\\.${escapeRegex(this.previewDomain)}$`,
  });

  /**
   * Every deploy is a new deployment of one commit, as on the local server.
   * Its parent is the nearest ready deployment on the commit's first-parent
   * history (the agent walks the git history). A commit already deployed for
   * the service is never deployed twice: unchanged (env and service) it is a
   * 409 with that deployment, otherwise that deployment is redeployed in
   * place. An older deployment of the branch, unchanged, takes the branch URL
   * back instead of the 409 (a rollback; the agent only moves the route). `amend` swaps the would-be parent (of the same service) to the new
   * commit instead, keeping its id, URL and lineage; with no such ancestor it
   * is an ordinary deploy. Streams the agent's SSE; see `launch`.
   */
  deploy = async (
    projectId: string,
    dto: CreateAgentDeploymentDto,
    user: LogtoUserWithOrganizations,
    response: Response,
  ): Promise<void> => {
    const project = await this.assertCanPush(projectId, user);
    const serviceName = serviceNameOf(dto.service);
    const ready = await this.deployAgentRepository.findDeployments({
      projectId,
      repo: dto.rootCommit,
      status: 'ready',
    });
    const env = {
      ...dto.env,
      ...(dto.dbLinks?.length
        ? await this.projectsService.resolveDatabaseLinks(project, dto.dbLinks)
        : {}),
    };
    const branch = dto.branch ?? null;
    // Another branch on the same commit gets its own deployment, so its branch URL exists.
    const deployed = ready.find(
      (d) =>
        d.serviceName === serviceName &&
        d.commit === dto.commit &&
        (d.branch ?? null) === branch,
    );
    if (deployed) {
      const unchanged =
        isDeepStrictEqual(
          agentServiceSpec(deployed.service[serviceName]),
          agentServiceSpec(dto.service[serviceName]),
        ) &&
        isDeepStrictEqual(
          (await this.vault.read(
            vaultPaths.deployment(projectId, deployed.deploymentId),
          )) ?? {},
          env,
        );
      // An older deployment of the branch takes its branch URL back: a rollback.
      const holdsBranchUrl =
        !branch ||
        this.branchAliases(projectId, ready).has(deployed.deploymentId);
      if (unchanged && holdsBranchUrl) {
        throw new ConflictException({
          code: 'ALREADY_DEPLOYED',
          message: 'This commit is already deployed.',
          deploymentId: deployed.deploymentId,
          url: `https://${deployed.host}`,
        });
      }
    }
    const nearest = (candidates: typeof ready) =>
      this.deployAgentRequests
        .parentOf(projectId, dto.rootCommit, {
          commit: dto.commit,
          candidates: candidates.map((d) => ({
            deploymentId: d.deploymentId,
            commit: d.commit,
          })),
        })
        .then(({ parentDeploymentId }) =>
          ready.find((d) => d.deploymentId === parentDeploymentId),
        );
    const amended =
      deployed ??
      (dto.amend
        ? await nearest(ready.filter((d) => d.serviceName === serviceName))
        : undefined);
    const parent = amended ? undefined : await nearest(ready);
    await this.launch(
      projectId,
      project,
      {
        repo: dto.rootCommit,
        commit: dto.commit,
        parentDeploymentId: amended
          ? amended.parentDeploymentId
          : (parent?.deploymentId ?? null),
        secondParentDeploymentId: amended?.secondParentDeploymentId ?? null,
        serviceName,
        service: dto.service,
        dbLinks: dto.dbLinks,
        branch,
      },
      env,
      response,
      amended,
    );
  };

  /**
   * Combines two ready deployments of one repo into a new deployment whose
   * commit is a git merge of theirs; both stay as they are. It runs with the
   * first one's service and env. Same commit, conflicts or unrelated
   * histories create nothing.
   */
  merge = async (
    projectId: string,
    { firstDeploymentId, secondDeploymentId }: MergeDeploymentsDto,
    user: LogtoUserWithOrganizations,
    response: Response,
  ): Promise<void> => {
    const project = await this.assertCanPush(projectId, user);
    if (firstDeploymentId === secondDeploymentId) {
      throw new BadRequestException('SAME_DEPLOYMENT');
    }
    const [first, second] = await Promise.all([
      this.deployAgentRepository.findDeployment(projectId, firstDeploymentId),
      this.deployAgentRepository.findDeployment(projectId, secondDeploymentId),
    ]);
    if (!first || !second) throw new NotFoundException('DEPLOYMENT_NOT_FOUND');
    if (first.repo !== second.repo) {
      throw new BadRequestException('DIFFERENT_REPOSITORIES');
    }
    if (first.status !== 'ready' || second.status !== 'ready') {
      throw new BadRequestException('DEPLOYMENT_NOT_READY');
    }
    if (first.commit === second.commit) {
      throw new BadRequestException('SAME_REVISION');
    }
    const { commit } = await this.deployAgentRequests.mergeCommits(
      projectId,
      first.repo,
      first.commit,
      second.commit,
    );
    const env =
      (await this.vault.read(
        vaultPaths.deployment(projectId, first.deploymentId),
      )) ?? {};
    await this.launch(
      projectId,
      project,
      {
        repo: first.repo,
        commit,
        parentDeploymentId: first.deploymentId,
        secondParentDeploymentId: second.deploymentId,
        serviceName: first.serviceName,
        service: first.service,
        dbLinks: first.dbLinks,
      },
      env,
      response,
    );
  };

  /**
   * Starts the agent deploy, records the deployment as preparing, and streams
   * a `deployment` event (id, parents, url, amended) then the agent's own
   * phases and `done` or `failed`. Errors before the agent's 200 surface as
   * JSON 4xx/5xx and record nothing. The upstream is read to the end even if
   * the client leaves, so the outcome is always recorded; only `ready` ones
   * are replayed. An amend reuses the deployment's id: the agent swaps it
   * blue/green and keeps the old commit running if the new one fails.
   */
  private launch = async (
    projectId: string,
    project: ProjectDocument,
    deployment: Omit<
      NewDeploymentData,
      'projectId' | 'organizationId' | 'deploymentId' | 'host'
    >,
    env: Record<string, string>,
    response: Response,
    amended?: DeploymentLean,
  ): Promise<void> => {
    const { id, host } = amended
      ? { id: amended.deploymentId, host: amended.host }
      : deploymentIdentity(projectId, this.previewDomain);
    // The agent takes the branch URL from the branch's previous deployment once this one serves.
    const branchUrlHost = deployment.branch
      ? this.branchHostOf(projectId, deployment.branch, deployment.serviceName)
      : null;
    const upstream = await this.deployAgentRequests.putDeployment(
      projectId,
      id,
      {
        repo: deployment.repo,
        ref: deployment.commit,
        host,
        aliases: branchUrlHost ? [branchUrlHost] : [],
        service: agentServiceSpec(deployment.service[deployment.serviceName]),
        env: this.agentEnv(projectId, env),
      },
    );
    if (!amended) {
      await this.deployAgentRepository.createDeployment({
        ...deployment,
        projectId,
        organizationId: project.organizationId,
        deploymentId: id,
        host,
      });
    }

    response.status(200);
    response.setHeader('Content-Type', 'text/event-stream');
    response.setHeader('Cache-Control', 'no-cache, no-transform');
    response.setHeader('X-Accel-Buffering', 'no');
    response.flushHeaders();

    const send = (chunk: string | Uint8Array) => {
      if (!response.destroyed && !response.writableEnded) response.write(chunk);
    };
    send(
      `event: deployment\ndata: ${JSON.stringify({
        deploymentId: id,
        parentDeploymentId: deployment.parentDeploymentId,
        secondParentDeploymentId: deployment.secondParentDeploymentId,
        url: `https://${host}`,
        branchUrl: branchUrlHost ? `https://${branchUrlHost}` : null,
        amended: !!amended,
      })}\n\n`,
    );

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

    if (lastSseEvent(tail)?.event === 'done') {
      await this.vault.write(vaultPaths.deployment(projectId, id), env);
      if (amended) {
        await this.deployAgentRepository.amendDeployment(projectId, id, {
          commit: deployment.commit,
          serviceName: deployment.serviceName,
          service: deployment.service,
          dbLinks: deployment.dbLinks,
          branch: deployment.branch,
        });
      } else {
        await this.deployAgentRepository.markDeployment(projectId, id, 'ready');
      }
    } else if (!amended) {
      await this.deployAgentRepository.markDeployment(
        projectId,
        id,
        'failed',
        failedStage(tail),
      );
    }
    if (!response.writableEnded) response.end();
  };

  /** Desired state the agent replays at boot: every ready deployment, pinned to its commit. */
  listDesiredDeployments = async (
    projectId: string,
  ): Promise<ReconcileItem[]> => {
    const docs = await this.deployAgentRepository.findDeployments({
      projectId,
      status: 'ready',
    });
    const aliases = this.branchAliases(projectId, docs);
    return Promise.all(
      docs.map(async (doc) => ({
        id: doc.deploymentId,
        repo: doc.repo,
        ref: doc.commit,
        host: doc.host,
        aliases: aliases.get(doc.deploymentId) ?? [],
        service: agentServiceSpec(doc.service[doc.serviceName]),
        env: this.agentEnv(
          projectId,
          (await this.vault.read(
            vaultPaths.deployment(projectId, doc.deploymentId),
          )) ?? {},
        ),
      })),
    );
  };

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
