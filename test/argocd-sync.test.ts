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
    withMongo: true,
    secretsChanged: false,
  });
  assert.deepEqual(calls, [
    `sync ${APP}`,
    `sync ${APP}`,
    `sync ${APP}`,
    `sync ${APP}-mongo`,
  ]);
});

test('changed secrets refresh the ExternalSecret, wait for ESO, then restart the agent', async () => {
  const { service, calls } = setup();
  await service.apply(PROJECT_ID, {
    created: false,
    withMongo: false,
    secretsChanged: true,
  });
  assert.deepEqual(calls, [
    `sync ${APP}`,
    'refresh ExternalSecret/deploy-agent-env',
    'read ExternalSecret',
    'read ExternalSecret',
    'restart Deployment/deploy-agent',
  ]);
});

test('an update without secret changes only syncs: previews keep running', async () => {
  const { service, calls } = setup([
    httpError(400, 'another operation is already in progress'),
  ]);
  await service.apply(PROJECT_ID, {
    created: false,
    withMongo: false,
    secretsChanged: false,
  });
  assert.deepEqual(calls, [`sync ${APP}`]);
});

test('other Argo errors are not retried', async () => {
  const { service } = setup([httpError(500)]);
  await assert.rejects(
    service.apply(PROJECT_ID, {
      created: true,
      withMongo: false,
      secretsChanged: false,
    }),
  );
});
