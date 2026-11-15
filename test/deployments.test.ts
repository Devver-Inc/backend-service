// Run: npm test
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DeployAgentService } from 'src/deploy-agent/deploy-agent.service';

const PROJECT_ID = '6650a1b2c3d4e5f6a7b8c9d0';
const ROOT = 'a'.repeat(40);
const C1 = '1'.repeat(40);
const C2 = '2'.repeat(40);

function sse(...events: [string, unknown][]) {
  const text = events
    .map(([e, d]) => `event: ${e}\ndata: ${JSON.stringify(d)}\n\n`)
    .join('');
  return {
    body: (async function* () {
      yield new TextEncoder().encode(text);
    })(),
  };
}

function setup(
  docs: Record<string, unknown>[],
  stream = sse(['phase', { phase: 'checkout' }], ['done', {}]),
) {
  const calls = {
    parentOf: [] as unknown[],
    put: [] as unknown[],
    created: [] as any[],
    marked: [] as unknown[],
    merged: [] as unknown[],
  };
  const repository = {
    findDeployments: async (f: { status?: string; repo?: string }) =>
      docs.filter(
        (d) =>
          (!f.status || d.status === f.status) &&
          (!f.repo || d.repo === f.repo),
      ),
    findDeployment: async (_: string, id: string) =>
      docs.find((d) => d.deploymentId === id) ?? null,
    createDeployment: async (d: unknown) => void calls.created.push(d),
    markDeployment: async (...a: unknown[]) =>
      void calls.marked.push(a.slice(1)),
  };
  const requests = {
    parentOf: async (_: string, __: string, body: unknown) => (
      calls.parentOf.push(body),
      { parentDeploymentId: 'p1' }
    ),
    mergeCommits: async (...a: unknown[]) => (
      calls.merged.push(a.slice(1)),
      { commit: 'f'.repeat(40) }
    ),
    putDeployment: async (_: string, id: string, body: unknown) => (
      calls.put.push({ id, body }),
      stream
    ),
  };
  const service = new DeployAgentService(
    repository as never,
    requests as never,
    {} as never,
    {
      assertProjectAccess: async () => ({
        organizationId: 'org',
        teamMembers: [],
      }),
    } as never,
    { write: async () => {}, read: async () => ({ FROM_VAULT: '1' }) } as never,
    { get: () => ({ K8S_BASE_DOMAIN: 'x.devver.app' }) } as never,
  );
  const written: string[] = [];
  const response = {
    destroyed: false,
    writableEnded: false,
    status() {},
    setHeader() {},
    flushHeaders() {},
    write: (c: string | Uint8Array) =>
      void written.push(
        typeof c === 'string' ? c : new TextDecoder().decode(c),
      ),
    end() {
      this.writableEnded = true;
    },
  };
  const user = {
    id: 'u',
    selectedOrganizationRoles: [{ roleName: 'admin' }],
  } as never;
  return { service, calls, response: response as never, user, written };
}

const ready = (id: string, commit: string, repo = ROOT) => ({
  deploymentId: id,
  repo,
  commit,
  status: 'ready',
  serviceName: 'web',
  service: { web: {} },
});

test('a deploy is a new deployment whose parent comes from the ready ones of its repo', async () => {
  const { service, calls, response, user, written } = setup([
    ready('d1', C1),
    ready('d2', C2, 'b'.repeat(40)),
    { ...ready('d3', C2), status: 'failed' },
  ]);
  await service.deploy(
    PROJECT_ID,
    { rootCommit: ROOT, commit: C2, service: { web: {} } } as never,
    user,
    response,
  );
  assert.deepEqual(calls.parentOf, [
    { commit: C2, candidates: [{ deploymentId: 'd1', commit: C1 }] },
  ]);
  assert.equal(calls.created[0].parentDeploymentId, 'p1');
  assert.equal(calls.created[0].secondParentDeploymentId, null);
  assert.equal(calls.created[0].commit, C2);
  assert.deepEqual(calls.marked, [[calls.created[0].deploymentId, 'ready']]);
  assert.match(
    written[0],
    /^event: deployment\ndata: .*"parentDeploymentId":"p1"/,
  );
});

test('a failed deploy is kept, marked failed in the phase that broke', async () => {
  const stream = sse(
    ['phase', { phase: 'checkout' }],
    ['failed', { code: 'INSTALL_FAILED', message: 'x' }],
  );
  const { service, calls, response, user } = setup([], stream);
  await service.deploy(
    PROJECT_ID,
    { rootCommit: ROOT, commit: C1, service: { web: {} } } as never,
    user,
    response,
  );
  assert.deepEqual(calls.marked, [
    [calls.created[0].deploymentId, 'failed', 'install'],
  ]);
});

test('merge rejects what the local server rejects', async () => {
  const docs = [
    ready('d1', C1),
    ready('d2', C2),
    ready('d3', C1),
    ready('d4', C2, 'b'.repeat(40)),
    { ...ready('d5', C2), status: 'failed' },
  ];
  const { service, response, user } = setup(docs);
  const merge = (a: string, b: string) =>
    service.merge(
      PROJECT_ID,
      { firstDeploymentId: a, secondDeploymentId: b },
      user,
      response,
    );
  await assert.rejects(merge('d1', 'd1'), /SAME_DEPLOYMENT/);
  await assert.rejects(merge('d1', 'nope'), /DEPLOYMENT_NOT_FOUND/);
  await assert.rejects(merge('d1', 'd4'), /DIFFERENT_REPOSITORIES/);
  await assert.rejects(merge('d1', 'd5'), /DEPLOYMENT_NOT_READY/);
  await assert.rejects(merge('d1', 'd3'), /SAME_REVISION/);
});

test('merge deploys the merge commit with both parents and the first one env', async () => {
  const { service, calls, response, user } = setup([
    ready('d1', C1),
    ready('d2', C2),
  ]);
  await service.merge(
    PROJECT_ID,
    { firstDeploymentId: 'd1', secondDeploymentId: 'd2' },
    user,
    response,
  );
  assert.deepEqual(calls.merged, [[ROOT, C1, C2]]);
  assert.equal(calls.created[0].commit, 'f'.repeat(40));
  assert.equal(calls.created[0].parentDeploymentId, 'd1');
  assert.equal(calls.created[0].secondParentDeploymentId, 'd2');
  assert.deepEqual((calls.put[0] as any).body.env, { FROM_VAULT: '1' });
});
