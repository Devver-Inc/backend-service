// Run: npm test
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DeployAgentService } from 'src/deploy-agent/deploy-agent.service';

const PROJECT_ID = '6650a1b2c3d4e5f6a7b8c9d0';
const ROOT = 'a'.repeat(40);

function setup(existing?: Record<string, unknown>) {
  const agentCalls: unknown[] = [];
  const doc: Record<string, unknown> | undefined = existing && {
    ...existing,
    save: async () => {},
  };
  const repository = {
    findRepoByRoot: async () => doc ?? null,
    findRepo: async () => doc,
    createRepo: async (data: object) => ({ ...data, _id: 'id' }),
    deleteRepo: async () => {},
  };
  const service = new DeployAgentService(
    repository as never,
    {
      putRepo: async (_: string, name: string, config: object) =>
        void agentCalls.push({ name, config }),
    } as never,
    { toRepoDto: (d: object) => d } as never,
    {
      assertProjectAccess: async () => ({
        organizationId: 'org',
        teamMembers: [],
      }),
    } as never,
    {} as never,
    { get: () => ({ K8S_BASE_DOMAIN: 'x.devver.app' }) } as never,
  );
  const user = {
    id: 'u',
    selectedOrganizationRoles: [{ roleName: 'admin' }],
  } as never;
  const init = (extra: object) =>
    service.initProject(
      PROJECT_ID,
      { rootCommit: ROOT, displayName: 'shop', ...extra },
      user,
    );
  return { service, init, user, agentCalls, doc };
}

test('a new repo sends its install command to the agent', async () => {
  const { init, agentCalls } = setup();
  const repo = await init({ install: 'npm ci' });
  assert.deepEqual(agentCalls, [
    { name: repo.name, config: { install: 'npm ci' } },
  ]);
});

test('a changed install on a known repo is stored and re-sent', async () => {
  const { init, agentCalls, doc } = setup({ name: 'known', install: 'npm ci' });
  await init({ install: 'pnpm i' });
  assert.equal(doc?.install, 'pnpm i');
  assert.deepEqual(agentCalls, [
    { name: 'known', config: { install: 'pnpm i' } },
  ]);
});

test('an unchanged install on a known repo does not call the agent', async () => {
  const { init, agentCalls } = setup({ name: 'known', install: 'npm ci' });
  await init({ install: 'npm ci' });
  await init({});
  assert.equal(agentCalls.length, 0);
});

test('updateRepo changes the display name', async () => {
  const { service, user, doc } = setup({ name: 'known', displayName: 'old' });
  const repo = await service.updateRepo(
    PROJECT_ID,
    'known',
    { displayName: 'new' },
    user,
  );
  assert.equal(repo.displayName, 'new');
  assert.equal(doc?.displayName, 'new');
});
