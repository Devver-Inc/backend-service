import { Injectable, Logger, MessageEvent } from '@nestjs/common';
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
import { ArgoDeploymentStatusEvent } from './_utils/types/argocd.types';
import { DeployAgentService } from 'src/deploy-agent/deploy-agent.service';
import { LogtoUserWithOrganizations } from 'src/logto/_utils/types/user-with-organization.type';

const POLLING_INTERVAL_MS = 5_000;
const HEARTBEAT_INTERVAL_MS = 30_000;

@Injectable()
export class ArgoCdSseService {
  private readonly logger = new Logger(ArgoCdSseService.name);
  private readonly streams = new Map<string, Observable<MessageEvent>>();

  constructor(
    private readonly argoCdRequests: ArgoCdRequests,
    private readonly deployAgentService: DeployAgentService,
  ) {}

  async getStatusByProject(
    projectId: string,
    user: LogtoUserWithOrganizations,
  ): Promise<ArgoDeploymentStatusEvent> {
    const appName = await this.deployAgentService.getArgoAppName(
      projectId,
      user,
    );
    return this.getCurrentStatus(appName);
  }

  async watchStatusByProject(
    projectId: string,
    user: LogtoUserWithOrganizations,
  ): Promise<Observable<MessageEvent>> {
    const appName = await this.deployAgentService.getArgoAppName(
      projectId,
      user,
    );
    return this.watchStatus(appName);
  }

  private getCurrentStatus = async (
    appName: string,
  ): Promise<ArgoDeploymentStatusEvent> =>
    this.argoCdRequests.getApplicationStatus(appName).then((app) => ({
      appName,
      healthStatus: app.status.health.status,
      syncStatus: app.status.sync.status,
      operationPhase: app.status.operationState?.phase,
      operationMessage: app.status.operationState?.message,
      timestamp: new Date().toISOString(),
    }));

  private watchStatus(appName: string): Observable<MessageEvent> {
    const existing = this.streams.get(appName);
    if (existing) return existing;

    const status$ = interval(POLLING_INTERVAL_MS).pipe(
      startWith(0),
      switchMap(() =>
        this.getCurrentStatus(appName).catch((err) => {
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
          prev?.operationPhase === curr?.operationPhase,
      ),
      filter((event): event is ArgoDeploymentStatusEvent => event !== null),
      map((event): MessageEvent => ({ data: event })),
    );

    const heartbeat$ = interval(HEARTBEAT_INTERVAL_MS).pipe(
      map((): MessageEvent => ({ type: 'ping', data: '' })),
    );

    const stream$ = merge(status$, heartbeat$).pipe(
      finalize(() => this.streams.delete(appName)),
      share({ resetOnRefCountZero: true }),
    );

    this.streams.set(appName, stream$);

    return stream$;
  }
}
