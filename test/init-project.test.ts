// Run: npm test
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DeployAgentService } from 'src/deploy-agent/deploy-agent.service';

const PROJECT_ID = '6650a1b2c3d4e5f6a7b8c9d0';
const ROOT = 'a'.repeat(40);

function setup(found: unknown[], createError?: { code: number }) {
  const created: { name: string }[] = [];
  const agentRepos: string[] = [];
  const repository = {
    findRepoByRoot: async () => found.shift() ?? null,
    createRepo: async (data: { name: string }) => {
      if (createError) throw createError;
      created.push(data);
      return { ...data, _id: 'id' };
    },
    deleteRepo: async () => {},
  };
  const service = new DeployAgentService(
    repository as never,
    {
      putRepo: async (_: string, name: string) => void agentRepos.push(name),
    } as never,
    { toRepoDto: (doc: { name: string }) => doc } as never,
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
  const init = () =>
    service.initProject(
      PROJECT_ID,
      { rootCommit: ROOT, displayName: 'shop-web' },
      user,
    );
  return { init, created, agentRepos };
}

test('init creates a repo with a generated name the agent accepts', async () => {
  const { init, created, agentRepos } = setup([]);
  const repo = await init();
  assert.match(repo.name, /^[a-z0-9][a-z0-9-]{0,62}$/);
  assert.deepEqual(agentRepos, [repo.name]);
  assert.equal(created.length, 1);
});

test('init of code already known returns its repo, created nowhere', async () => {
  const { init, created, agentRepos } = setup([
    { name: 'known', save: async () => {} },
  ]);
  assert.equal((await init()).name, 'known');
  assert.equal(created.length + agentRepos.length, 0);
});

test('two inits of the same code at once end in the same repo', async () => {
  const { init } = setup([null, { name: 'winner' }], { code: 11000 });
  assert.equal((await init()).name, 'winner');
});
