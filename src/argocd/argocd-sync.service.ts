import { Injectable, Logger } from '@nestjs/common';
import { isAxiosError } from 'axios';
import { projectNamespace } from 'src/_utils/functions/project-keys.function';
import { ArgoCdRequests, ArgoResourceRef } from './argocd.requests';

// The ApplicationSet creates a project's Application a few minutes after the commit at most.
const SYNC_ATTEMPTS = 20;
const SYNC_RETRY_MS = 15_000;
const REFRESH_WAIT_MS = 30_000;

export interface ProjectPublished {
  created: boolean;
  withMongo: boolean;
  secretsChanged: boolean;
}

/**
 * Argo rereads git about every 30 s and ESO rereads Vault every 15 min, so
 * after the backend writes Vault and commits values it forces both, through
 * the Argo API only (no Kubernetes rights): sync the Application, and when
 * an existing project's secrets changed, refresh its ExternalSecret then
 * recreate the agent pod, which reads its env only at start.
 */
@Injectable()
export class ArgoCdSyncService {
  private readonly logger = new Logger(ArgoCdSyncService.name);

  constructor(private readonly argoCdRequests: ArgoCdRequests) {}

  /** Runs in the background: the request that published the project does not wait for Argo. */
  projectPublished(projectId: string, change: ProjectPublished): void {
    void this.apply(projectId, change).catch((error) =>
      this.logger.error(
        `Argo sync of project ${projectId} failed: ${describe(error)}`,
      ),
    );
  }

  async apply(projectId: string, change: ProjectPublished): Promise<void> {
    const app = projectNamespace(projectId);
    await this.syncWhenReady(app);
    if (change.withMongo) await this.syncWhenReady(`${app}-mongo`);
    if (!change.created && change.secretsChanged) {
      await this.reloadAgentSecrets(app, projectNamespace(projectId));
    }
  }

  private async syncWhenReady(app: string): Promise<void> {
    for (let attempt = 1; ; attempt++) {
      try {
        return await this.argoCdRequests.sync(app);
      } catch (error) {
        // A sync already running (auto-sync) does the same work.
        if (
          status(error) === 400 &&
          /already in progress/i.test(describe(error))
        )
          return;
        const notCreatedYet = status(error) === 404 || status(error) === 403;
        if (!notCreatedYet || attempt === SYNC_ATTEMPTS) throw error;
        await this.sleep(SYNC_RETRY_MS);
      }
    }
  }

  private async reloadAgentSecrets(
    app: string,
    namespace: string,
  ): Promise<void> {
    const externalSecret: ArgoResourceRef = {
      namespace,
      resourceName: 'deploy-agent-env',
      group: 'external-secrets.io',
      version: 'v1',
      kind: 'ExternalSecret',
    };
    const asked = Date.now();
    await this.argoCdRequests.runResourceAction(app, externalSecret, 'refresh');
    for (let waited = 0; waited < REFRESH_WAIT_MS; waited += 1000) {
      const manifest = await this.argoCdRequests.getResourceManifest(
        app,
        externalSecret,
      );
      const refreshed = Date.parse(manifest.status?.refreshTime ?? '');
      // Second precision on both sides.
      if (refreshed >= Math.floor(asked / 1000) * 1000) break;
      await this.sleep(1000);
    }
    // Not the Deployment restart action: the ApplicationSet's selfHeal reverts
    // its restartedAt annotation at once. A deleted pod is recreated by its
    // ReplicaSet and reads the new Secret, without drifting from git.
    const pods = (await this.argoCdRequests.getResourceTree(app)).filter(
      (node) =>
        node.kind === 'Pod' &&
        node.parentRefs?.some(
          (ref) =>
            ref.kind === 'ReplicaSet' && ref.name.startsWith('deploy-agent-'),
        ),
    );
    for (const pod of pods) {
      await this.argoCdRequests.deleteResource(app, {
        namespace,
        resourceName: pod.name,
        group: '',
        version: 'v1',
        kind: 'Pod',
      });
    }
  }

  private sleep = (ms: number) =>
    new Promise((resolve) => setTimeout(resolve, ms));
}

const status = (error: unknown) =>
  isAxiosError(error) ? error.response?.status : undefined;

const describe = (error: unknown) =>
  isAxiosError(error)
    ? `${error.response?.status ?? ''} ${JSON.stringify(error.response?.data ?? error.message)}`
    : error instanceof Error
      ? error.message
      : String(error);
