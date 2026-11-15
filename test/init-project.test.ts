// Run: npm test
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DeployAgentMapper } from 'src/deploy-agent/deploy-agent.mapper';
import { DeployAgentService } from 'src/deploy-agent/deploy-agent.service';

const PROJECT_ID = '6650a1b2c3d4e5f6a7b8c9d0';
const ROOT = 'a'.repeat(40);

test('init names the repo after the root commit and passes the install on', async () => {
  const agentCalls: unknown[] = [];
  const config = {
    get: () => ({
      K8S_BASE_DOMAIN: 'x.devver.app',
      GIT_SSH_HOST: 'git.x.devver.app',
    }),
  };
  const service = new DeployAgentService(
    {} as never,
    {
      putRepo: async (projectId: string, name: string, body: object) =>
        void agentCalls.push({ projectId, name, body }),
    } as never,
    new DeployAgentMapper(config as never),
    {
      assertProjectAccess: async () => ({
        organizationId: 'org',
        teamMembers: [],
      }),
    } as never,
    {} as never,
    config as never,
  );
  const user = {
    id: 'u',
    selectedOrganizationRoles: [{ roleName: 'admin' }],
  } as never;

  const res = await service.initProject(
    PROJECT_ID,
    { rootCommit: ROOT, install: 'npm ci' },
    user,
  );
  assert.deepEqual(agentCalls, [
    { projectId: PROJECT_ID, name: ROOT, body: { install: 'npm ci' } },
  ]);
  assert.equal(
    res.sshPushUrl,
    `ssh://${PROJECT_ID}@git.x.devver.app/app/repos/${ROOT}.git`,
  );
});
