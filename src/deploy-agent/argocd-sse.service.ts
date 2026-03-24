import { Injectable, Logger, MessageEvent } from '@nestjs/common';
import { interval, merge, Observable, share } from 'rxjs';
import {
  catchError,
  distinctUntilChanged,
  finalize,
  map,
  startWith,
  switchMap,
} from 'rxjs/operators';
import { ArgoCdRequests } from './argocd.requests';
import { ArgoDeploymentStatusEvent } from './_utils/types/argocd.types';

const POLLING_INTERVAL_MS = 5_000;
const HEARTBEAT_INTERVAL_MS = 30_000;

@Injectable()
export class ArgoCdSseService {
  private readonly logger = new Logger(ArgoCdSseService.name);
  private readonly streams = new Map<string, Observable<MessageEvent>>();

  constructor(private readonly argoCdRequests: ArgoCdRequests) {}

  watchStatus(appName: string): Observable<MessageEvent> {
    const existing = this.streams.get(appName);
    if (existing) return existing;

    const status$ = interval(POLLING_INTERVAL_MS).pipe(
      startWith(0),
      switchMap(() =>
        this.argoCdRequests.getApplicationStatus(appName).then((app) => {
          const event: ArgoDeploymentStatusEvent = {
            appName,
            healthStatus: app.status.health.status,
            syncStatus: app.status.sync.status,
            operationPhase: app.status.operationState?.phase,
            operationMessage: app.status.operationState?.message,
            timestamp: new Date().toISOString(),
          };
          return event;
        }),
      ),
      catchError((err, source$) => {
        this.logger.warn(
          `Failed to fetch ArgoCD status for "${appName}": ${err instanceof Error ? err.message : String(err)}`,
        );
        return source$;
      }),
      distinctUntilChanged(
        (prev, curr) =>
          prev.healthStatus === curr.healthStatus &&
          prev.syncStatus === curr.syncStatus &&
          prev.operationPhase === curr.operationPhase,
      ),
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
