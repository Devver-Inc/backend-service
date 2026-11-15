// Run: npm test
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { deploymentIdentity } from 'src/deploy-agent/_utils/functions/deployment-identity.function';
import { failedStage } from 'src/deploy-agent/_utils/functions/failed-stage.function';
import { lastSseEvent } from 'src/deploy-agent/_utils/functions/last-sse-event.function';

const PROJECT_ID = '6650a1b2c3d4e5f6a7b8c9d0';
const ID = /^[a-z0-9][a-z0-9-]{0,62}$/;

test('every deploy gets a new id whose host fits one DNS label', () => {
  const a = deploymentIdentity(PROJECT_ID, 'preview.devver.app');
  const b = deploymentIdentity(PROJECT_ID, 'preview.devver.app');
  assert.notEqual(a.id, b.id);
  assert.match(a.id, ID);
  const label = a.host.split('.')[0];
  assert.ok(label.length <= 63, label);
  assert.equal(label, `${a.id}--${PROJECT_ID}`);
});

test('a failure is in the phase after the last one reported', () => {
  const phase = (p: string) =>
    `event: phase\ndata: {"phase":"${p}","durationMs":1}\n\n`;
  const failed = 'event: failed\ndata: {"code":"X","message":"x"}\n\n';
  assert.equal(failedStage(phase('checkout') + failed), 'install');
  assert.equal(
    failedStage(phase('checkout') + phase('install') + phase('build') + failed),
    'start',
  );
  assert.equal(failedStage(failed), 'checkout');
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
