// Run: npm test
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { branchHost } from 'src/deploy-agent/_utils/functions/branch-host.function';

const PROJECT = '6afed342992cd18df0f3d68f';
const label = (host: string) => host.split('.')[0];

test('a branch becomes a lowercase slug with single dashes', () => {
  assert.equal(
    branchHost('Feat/Login--Page_2', 'web', PROJECT, 'preview.x'),
    `feat-login-page-2--web--${PROJECT}.preview.x`,
  );
});

test('a long branch is cut and hashed, and the label fits DNS', () => {
  const long = 'feature/a-very-long-branch-name-that-goes-on-and-on';
  const host = branchHost(long, 'api', PROJECT, 'preview.x');
  assert.ok(label(host).length <= 63);
  assert.notEqual(host, branchHost(`${long}-2`, 'api', PROJECT, 'preview.x'));
});

test('a branch with no usable character still gets a host', () => {
  assert.equal(
    branchHost('___', 'web', PROJECT, 'preview.x'),
    `branch--web--${PROJECT}.preview.x`,
  );
});
