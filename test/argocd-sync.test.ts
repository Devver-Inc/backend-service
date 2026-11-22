// Run: npm test
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { AxiosError, AxiosHeaders } from 'axios';
import { ArgoCdSyncService } from 'src/argocd/argocd-sync.service';

const PROJECT_ID = '6650a1b2c3d4e5f6a7b8c9d0';
const APP = `p-${PROJECT_ID}`;

const httpError = (status: number, message = '') =>
  new AxiosError('x', 'ERR', undefined, undefined, {
    status,
    data: { message },
    statusText: '',
    headers: {},
    config: { headers: new AxiosHeaders() },
  });

function setup(syncFailures: AxiosError[] = []) {
  const calls: string[] = [];
  let refreshTime = '2000-01-01T00:00:00Z';
  const argo = {
    sync: async (app: string) => {
      calls.push(`sync ${app}`);
      const failure = syncFailures.shift();
      if (failure) throw failure;
    },
    runResourceAction: async (
      _: string,
      r: { kind: string; resourceName: string },
      action: string,
    ) => {
      calls.push(`${action} ${r.kind}/${r.resourceName}`);
    },
    getResourceTree: async () => [
      {
        kind: 'Pod',
        name: 'deploy-agent-abc-1',
        namespace: APP,
        parentRefs: [{ kind: 'ReplicaSet', name: 'deploy-agent-abc' }],
      },
      {
        kind: 'Pod',
        name: `${APP}-postgres-0`,
        namespace: APP,
        parentRefs: [{ kind: 'StatefulSet', name: `${APP}-postgres` }],
      },
    ],
    deleteResource: async (
      _: string,
      r: { kind: string; resourceName: string },
    ) => {
      calls.push(`delete ${r.kind}/${r.resourceName}`);
    },
    getResourceManifest: async () => {
      calls.push('read ExternalSecret');
      const status = { refreshTime };
      refreshTime = new Date(Date.now() + 1000).toISOString();
      return { status };
    },
  };
  const service = new ArgoCdSyncService(argo as never);
  (service as unknown as { sleep: () => Promise<void> }).sleep = async () => {};
  return { service, calls };
}

test('a new project waits for its Application, then syncs it and its database', async () => {
  const { service, calls } = setup([httpError(404), httpError(403)]);
  await service.apply(PROJECT_ID, {
    created: true,
    services: ['postgres'],
    secretsChanged: false,
  });
  assert.deepEqual(calls, [
    `sync ${APP}`,
    `sync ${APP}`,
    `sync ${APP}`,
    `sync ${APP}-postgres`,
  ]);
});

test('changed secrets refresh the ExternalSecret, wait for ESO, then recreate only the agent pod', async () => {
  const { service, calls } = setup();
  await service.apply(PROJECT_ID, {
    created: false,
    services: [],
    secretsChanged: true,
  });
  assert.deepEqual(calls, [
    `sync ${APP}`,
    'refresh ExternalSecret/deploy-agent-env',
    'read ExternalSecret',
    'read ExternalSecret',
    'delete Pod/deploy-agent-abc-1',
  ]);
});

test('an update without secret changes only syncs: previews keep running', async () => {
  const { service, calls } = setup([
    httpError(400, 'another operation is already in progress'),
  ]);
  await service.apply(PROJECT_ID, {
    created: false,
    services: [],
    secretsChanged: false,
  });
  assert.deepEqual(calls, [`sync ${APP}`]);
});

test('other Argo errors are not retried', async () => {
  const { service } = setup([httpError(500)]);
  await assert.rejects(
    service.apply(PROJECT_ID, {
      created: true,
      services: [],
      secretsChanged: false,
    }),
  );
});
