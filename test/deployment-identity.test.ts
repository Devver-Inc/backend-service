// Run: npm test
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { deploymentIdentity } from 'src/deploy-agent/_utils/functions/deployment-identity.function';
import { lastSseEvent } from 'src/deploy-agent/_utils/functions/last-sse-event.function';

const PROJECT_ID = '6650a1b2c3d4e5f6a7b8c9d0';
const ID = /^[a-z0-9][a-z0-9-]{0,62}$/;

test('ids and hosts fit the agent and DNS limits', () => {
  const long = 'x'.repeat(120);
  for (const [repo, branch] of [
    ['shop', 'main'],
    ['shop', 'feature/Login_Page'],
    [long.slice(0, 63), long],
  ]) {
    for (const service of ['web', 'api'] as const) {
      const { id, host } = deploymentIdentity(
        PROJECT_ID,
        repo,
        branch,
        service,
        'preview.devver.app',
      );
      assert.match(id, ID);
      const label = host.split('.')[0];
      assert.ok(label.length <= 63, label);
      assert.equal(label.split('--').length, 2, label);
      assert.ok(label.endsWith(`--${PROJECT_ID}`));
    }
  }
});

test('branches that slug alike still get distinct ids', () => {
  const a = deploymentIdentity(PROJECT_ID, 'shop', 'feature/x', 'web', 'p.d');
  const b = deploymentIdentity(PROJECT_ID, 'shop', 'feature-x', 'web', 'p.d');
  const c = deploymentIdentity(PROJECT_ID, 'shop', 'feature/x', 'api', 'p.d');
  assert.notEqual(a.id, b.id);
  assert.notEqual(a.id, c.id);
  assert.equal(
    a.id,
    deploymentIdentity(PROJECT_ID, 'shop', 'feature/x', 'web', 'p.d').id,
  );
});

test('lastSseEvent returns the terminal event and skips a cut-off head', () => {
  const stream =
    'a":"install"}\n\n' +
    'event: phase\ndata: {"phase":"build"}\n\n' +
    'event: done\ndata: {"id":"shop-main-1","commit":"abc"}\n\n';
  assert.deepEqual(lastSseEvent(stream), {
    event: 'done',
    data: { id: 'shop-main-1', commit: 'abc' },
  });
  assert.equal(lastSseEvent('data: {"x":1"\n\n'), undefined);
});
