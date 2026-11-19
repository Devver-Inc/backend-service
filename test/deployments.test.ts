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
  parentId: string | null = 'p1',
) {
  const calls = {
    parentOf: [] as unknown[],
    put: [] as unknown[],
    created: [] as any[],
    marked: [] as unknown[],
    merged: [] as unknown[],
    amended: [] as unknown[],
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
    amendDeployment: async (...a: unknown[]) =>
      void calls.amended.push(a.slice(1)),
    markDeployment: async (...a: unknown[]) =>
      void calls.marked.push(a.slice(1)),
  };
  const requests = {
    parentOf: async (_: string, __: string, body: unknown) => (
      calls.parentOf.push(body),
      { parentDeploymentId: parentId }
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
  const { service, calls, response, user, written } = setup(
    [
      ready('d1', C1),
      ready('d2', C2, 'b'.repeat(40)),
      { ...ready('d3', C2), status: 'failed' },
    ],
    undefined,
    'd1',
  );
  await service.deploy(
    PROJECT_ID,
    { rootCommit: ROOT, commit: C2, service: { web: {} } } as never,
    user,
    response,
  );
  assert.deepEqual(calls.parentOf, [
    { commit: C2, candidates: [{ deploymentId: 'd1', commit: C1 }] },
  ]);
  assert.equal(calls.created[0].parentDeploymentId, 'd1');
  assert.equal(calls.created[0].secondParentDeploymentId, null);
  assert.equal(calls.created[0].commit, C2);
  assert.deepEqual(calls.marked, [[calls.created[0].deploymentId, 'ready']]);
  assert.match(
    written[0],
    /^event: deployment\ndata: .*"parentDeploymentId":"d1"/,
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
  assert.deepEqual((calls.put[0] as any).body.env, {
    FROM_VAULT: '1',
    DEVVER_PREVIEW_ORIGIN_REGEX: `^https://[a-z0-9-]+--${PROJECT_ID}\\.preview\\.x\\.devver\\.app$`,
  });
  const origin = new RegExp(
    (calls.put[0] as any).body.env.DEVVER_PREVIEW_ORIGIN_REGEX,
  );
  assert.ok(origin.test(`https://abc-1--${PROJECT_ID}.preview.x.devver.app`));
  assert.ok(!origin.test('https://abc--other.preview.x.devver.app'));
  assert.ok(
    !origin.test(`https://abc--${PROJECT_ID}.preview.x.devver.app.evil.com`),
  );
});

test('amend swaps the nearest deployed ancestor of the same service to the new commit', async () => {
  const docs = [
    {
      ...ready('d1', C1),
      host: 'd1--p.preview',
      parentDeploymentId: 'd0',
      secondParentDeploymentId: null,
    },
    { ...ready('d9', C1), serviceName: 'api' },
  ];
  const { service, calls, response, user, written } = setup(
    docs,
    undefined,
    'd1',
  );
  await service.deploy(
    PROJECT_ID,
    {
      rootCommit: ROOT,
      commit: C2,
      service: { web: {} },
      amend: true,
    } as never,
    user,
    response,
  );
  assert.deepEqual((calls.parentOf[0] as any).candidates, [
    { deploymentId: 'd1', commit: C1 },
  ]);
  assert.equal((calls.put[0] as any).id, 'd1');
  assert.equal(calls.created.length, 0);
  assert.equal((calls.amended[0] as any)[0], 'd1');
  assert.equal((calls.amended[0] as any)[1].commit, C2);
  assert.match(
    written[0],
    /"deploymentId":"d1".*"parentDeploymentId":"d0".*"amended":true/,
  );
});

test('a commit already deployed for the service, unchanged, creates nothing, amend or not', async () => {
  for (const amend of [false, true]) {
    const { service, calls, response, user } = setup([
      { ...ready('d1', C1), host: 'd1--p.preview' },
    ]);
    await assert.rejects(
      service.deploy(
        PROJECT_ID,
        {
          rootCommit: ROOT,
          commit: C1,
          service: { web: {} },
          env: { FROM_VAULT: '1' },
          amend,
        } as never,
        user,
        response,
      ),
      (e: any) =>
        e.status === 409 &&
        e.response.code === 'ALREADY_DEPLOYED' &&
        e.response.url === 'https://d1--p.preview',
    );
    assert.equal(calls.put.length, 0);
  }
});

test('a commit already deployed with another env is redeployed in place', async () => {
  const { service, calls, response, user, written } = setup([
    {
      ...ready('d1', C1),
      host: 'd1--p.preview',
      parentDeploymentId: 'd0',
      secondParentDeploymentId: null,
    },
  ]);
  await service.deploy(
    PROJECT_ID,
    {
      rootCommit: ROOT,
      commit: C1,
      service: { web: {} },
      env: { API_URL: 'https://b' },
    } as never,
    user,
    response,
  );
  assert.equal((calls.put[0] as any).id, 'd1');
  assert.equal((calls.put[0] as any).body.env.API_URL, 'https://b');
  assert.equal(calls.created.length, 0);
  assert.equal((calls.amended[0] as any)[0], 'd1');
  assert.match(written[0], /"parentDeploymentId":"d0".*"amended":true/);
});

test('the same commit on another service is a new deployment', async () => {
  const { service, calls, response, user } = setup([
    { ...ready('d1', C1), serviceName: 'api' },
  ]);
  await service.deploy(
    PROJECT_ID,
    { rootCommit: ROOT, commit: C1, service: { web: {} } } as never,
    user,
    response,
  );
  assert.equal(calls.created.length, 1);
});

test('amend with no deployed ancestor is an ordinary new deployment', async () => {
  const { service, calls, response, user } = setup([], undefined, null);
  await service.deploy(
    PROJECT_ID,
    {
      rootCommit: ROOT,
      commit: C1,
      service: { web: {} },
      amend: true,
    } as never,
    user,
    response,
  );
  assert.equal(calls.created.length, 1);
  assert.equal(calls.amended.length, 0);
});

test('a failed amend leaves the deployment on its old commit', async () => {
  const stream = sse(['failed', { code: 'BUILD_FAILED', message: 'x' }]);
  const { service, calls, response, user } = setup(
    [{ ...ready('d1', C1), host: 'h' }],
    stream,
    'd1',
  );
  await service.deploy(
    PROJECT_ID,
    {
      rootCommit: ROOT,
      commit: C2,
      service: { web: {} },
      amend: true,
    } as never,
    user,
    response,
  );
  assert.equal(
    calls.amended.length + calls.marked.length + calls.created.length,
    0,
  );
});

test('the agent never receives the nulls Mongo stores for unset service fields', async () => {
  const stored = {
    web: { root: null, install: null, build: null, start: 'node .' },
  };
  const { service, calls, response, user } = setup([
    { ...ready('d1', C1), service: stored },
    ready('d2', C2),
  ]);
  await service.merge(
    PROJECT_ID,
    { firstDeploymentId: 'd1', secondDeploymentId: 'd2' },
    user,
    response,
  );
  assert.deepEqual((calls.put[0] as any).body.service, { start: 'node .' });
});

test('another branch on the same commit gets its own deployment', async () => {
  const { service, calls, response, user } = setup([
    { ...ready('d1', C1), branch: 'main' },
  ]);
  await service.deploy(
    PROJECT_ID,
    {
      rootCommit: ROOT,
      commit: C1,
      branch: 'feat/x',
      service: { web: {} },
      env: { FROM_VAULT: '1' },
    } as never,
    user,
    response,
  );
  assert.equal(calls.created.length, 1);
  assert.equal(calls.created[0].branch, 'feat/x');
});

test('reconcile gives each branch URL to the latest ready deployment of its branch and service', async () => {
  const at = (iso: string) => new Date(iso);
  const docs = [
    { ...ready('old', C1), branch: 'main', deployedAt: at('2026-01-01') },
    { ...ready('new', C2), branch: 'main', deployedAt: at('2026-01-02') },
    {
      ...ready('api', C1),
      serviceName: 'api',
      service: { api: {} },
      branch: 'main',
      deployedAt: at('2026-01-01'),
    },
    {
      ...ready('feat', C1),
      branch: 'feat/Login',
      deployedAt: at('2026-01-01'),
    },
    { ...ready('nobranch', C2), deployedAt: at('2026-01-03') },
  ];
  const { service } = setup(docs);
  const host = (h: string) => `${h}--${PROJECT_ID}.preview.x.devver.app`;
  const items = await service.listDesiredDeployments(PROJECT_ID);
  assert.deepEqual(Object.fromEntries(items.map((i) => [i.id, i.aliases])), {
    old: [],
    new: [host('main--web')],
    api: [host('main--api')],
    feat: [host('feat-login--web')],
    nobranch: [],
  });
  // Same env as a deploy, or the agent would restart every deployment on reconcile.
  assert.ok(items.every((i) => i.env?.DEVVER_PREVIEW_ORIGIN_REGEX));
});

test('a deploy asks the agent for its branch URL and announces it', async () => {
  const { service, calls, response, user, written } = setup([]);
  await service.deploy(
    PROJECT_ID,
    {
      rootCommit: ROOT,
      commit: C1,
      branch: 'main',
      service: { web: {} },
    } as never,
    user,
    response,
  );
  const url = `main--web--${PROJECT_ID}.preview.x.devver.app`;
  assert.deepEqual((calls.put[0] as any).body.aliases, [url]);
  assert.match(
    written[0],
    new RegExp(`"branchUrl":"https://${url.replace(/\./g, '\\.')}"`),
  );
});
