import { HttpStatus, Injectable, Logger, MessageEvent } from '@nestjs/common';
import { isAxiosError } from 'axios';
import { interval, merge, Observable, share } from 'rxjs';
import {
  distinctUntilChanged,
  filter,
  finalize,
  map,
  startWith,
  switchMap,
} from 'rxjs/operators';
import { ArgoCdRequests } from './argocd.requests';
import {
  ArgoApplicationDeploymentStatus,
  ArgoDeploymentStatusEvent,
} from './_utils/types/argocd.types';
import {
  ArgoHealthStatus,
  ArgoSyncStatus,
} from './_utils/constants/argocd.constants';
import { DeployAgentService } from 'src/deploy-agent/deploy-agent.service';
import { LogtoUserWithOrganizations } from 'src/logto/_utils/types/user-with-organization.type';
import { ProjectsService } from 'src/projects/projects.service';
import { toSlug } from 'src/_utils/functions/to-slug.function';
import { ProjectDocument } from 'src/projects/project.schema';

const POLLING_INTERVAL_MS = 5_000;
const HEARTBEAT_INTERVAL_MS = 30_000;

@Injectable()
export class ArgoCdSseService {
  private readonly logger = new Logger(ArgoCdSseService.name);
  private readonly streams = new Map<string, Observable<MessageEvent>>();

  constructor(
    private readonly argoCdRequests: ArgoCdRequests,
    private readonly deployAgentService: DeployAgentService,
    private readonly projectsService: ProjectsService,
  ) {}

  async getStatusByProject(
    projectId: string,
    user: LogtoUserWithOrganizations,
  ): Promise<ArgoDeploymentStatusEvent> {
    const appName = await this.deployAgentService.getArgoAppName(
      projectId,
      user,
    );
    const probe = this.buildProbe(projectId, user);
    const project = await this.projectsService.findProjectById(projectId);
    return this.getCurrentStatus(
      appName,
      probe,
      this.getMongoAppName(project, user),
    );
  }

  async watchStatusByProject(
    projectId: string,
    user: LogtoUserWithOrganizations,
  ): Promise<Observable<MessageEvent>> {
    const appName = await this.deployAgentService.getArgoAppName(
      projectId,
      user,
    );
    const probe = this.buildProbe(projectId, user);
    const project = await this.projectsService.findProjectById(projectId);
    return this.watchStatus(
      appName,
      probe,
      this.getMongoAppName(project, user),
    );
  }

  private buildProbe(
    projectId: string,
    user: LogtoUserWithOrganizations,
  ): () => Promise<boolean> {
    return () =>
      this.deployAgentService
        .listDeployments(projectId, user)
        .then(() => true)
        .catch(() => false);
  }

  private getCurrentStatus = async (
    appName: string,
    probe?: () => Promise<boolean>,
    mongoAppName?: string,
  ): Promise<ArgoDeploymentStatusEvent> => {
    const application = this.toApplicationStatus(
      await this.argoCdRequests.getApplicationStatus(appName),
      'application',
    );
    const applications = [application];

    if (mongoAppName) {
      applications.push(await this.getOptionalApplicationStatus(mongoAppName));
    }

    const healthStatus = this.resolveHealthStatus(
      applications.map((item) => item.healthStatus),
    );
    const syncStatus = this.resolveSyncStatus(
      applications.map((item) => item.syncStatus),
    );

    const podReady =
      healthStatus === ArgoHealthStatus.Healthy &&
      syncStatus === ArgoSyncStatus.Synced &&
      probe
        ? await probe()
        : false;

    return {
      appName,
      healthStatus,
      syncStatus,
      operationPhase: application.operationPhase,
      operationMessage: application.operationMessage,
      timestamp: new Date().toISOString(),
      podReady,
      applications,
    };
  };

  private watchStatus(
    appName: string,
    probe?: () => Promise<boolean>,
    mongoAppName?: string,
  ): Observable<MessageEvent> {
    const streamKey = mongoAppName ? `${appName}:${mongoAppName}` : appName;
    const existing = this.streams.get(streamKey);
    if (existing) return existing;

    const status$ = interval(POLLING_INTERVAL_MS).pipe(
      startWith(0),
      switchMap(() =>
        this.getCurrentStatus(appName, probe, mongoAppName).catch((err) => {
          this.logger.warn(
            `Failed to fetch ArgoCD status for "${appName}": ${err instanceof Error ? err.message : String(err)}`,
          );
          return null;
        }),
      ),

      distinctUntilChanged(
        (prev, curr) =>
          prev?.healthStatus === curr?.healthStatus &&
          prev?.syncStatus === curr?.syncStatus &&
          prev?.operationPhase === curr?.operationPhase &&
          prev?.podReady === curr?.podReady &&
          JSON.stringify(prev?.applications) ===
            JSON.stringify(curr?.applications),
      ),
      filter((event): event is ArgoDeploymentStatusEvent => event !== null),
      map((event): MessageEvent => ({ data: event })),
    );

    const heartbeat$ = interval(HEARTBEAT_INTERVAL_MS).pipe(
      map((): MessageEvent => ({ type: 'ping', data: '' })),
    );

    const stream$ = merge(status$, heartbeat$).pipe(
      finalize(() => this.streams.delete(streamKey)),
      share({ resetOnRefCountZero: true }),
    );

    this.streams.set(streamKey, stream$);

    return stream$;
  }

  private getMongoAppName(
    project: ProjectDocument,
    user: LogtoUserWithOrganizations,
  ): string | undefined {
    if (!project.mongoConfiguration?.enabled) {
      return undefined;
    }

    return `${toSlug(user.currentOrganization.name)}-${toSlug(project.name)}-mongo`;
  }

  private toApplicationStatus(
    app: Awaited<ReturnType<ArgoCdRequests['getApplicationStatus']>>,
    type: string,
  ): ArgoApplicationDeploymentStatus {
    return {
      appName: app.metadata.name,
      type,
      healthStatus: app.status.health.status,
      syncStatus: app.status.sync.status,
      operationPhase: app.status.operationState?.phase,
      operationMessage: app.status.operationState?.message,
    };
  }

  private async getOptionalApplicationStatus(
    appName: string,
  ): Promise<ArgoApplicationDeploymentStatus> {
    try {
      return this.toApplicationStatus(
        await this.argoCdRequests.getApplicationStatus(appName),
        'mongo',
      );
    } catch (err) {
      if (!isAxiosError(err) || err.response?.status !== HttpStatus.NOT_FOUND) {
        throw err;
      }

      return {
        appName,
        type: 'mongo',
        healthStatus: 'Unknown',
        syncStatus: 'Unknown',
        operationPhase: undefined,
        operationMessage:
          err instanceof Error ? err.message : 'Failed to fetch application',
      };
    }
  }

  private resolveHealthStatus(statuses: string[]): string {
    return (
      statuses.find((status) => status !== ArgoHealthStatus.Healthy) ??
      ArgoHealthStatus.Healthy
    );
  }

  private resolveSyncStatus(statuses: string[]): string {
    return (
      statuses.find((status) => status !== ArgoSyncStatus.Synced) ??
      ArgoSyncStatus.Synced
    );
  }
}
