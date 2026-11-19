// Run: npm test
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { LogtoRequests } from 'src/logto/logto.requests';

const org = (
  id: string,
  name: string,
  description: string,
  workDomain?: string,
) => ({
  id,
  name,
  description,
  customData: { ownerId: 'u', logoUrl: '', workDomain },
});

const lookup = (orgs: ReturnType<typeof org>[]) => {
  const requests = new LogtoRequests({} as never, {} as never, {} as never);
  requests.getOrganizations = (async () => orgs) as never;
  return (domain: string) =>
    requests.findWorkOrganization(domain).then((o) => o?.id);
};

test('a work org is found by its mark, not by a name anyone can take', async () => {
  const find = lookup([
    org('renamed', 'acme.com', "acme.com's personal organization"),
    org('work', 'Acme', 'anything', 'acme.com'),
  ]);
  assert.equal(await find('acme.com'), 'work');
});

test('a work org created before the mark is still found', async () => {
  const find = lookup([
    org('legacy', 'acme.com', 'acme.com professional Organization'),
  ]);
  assert.equal(await find('acme.com'), 'legacy');
});

test('no work org: a renamed org does not count', async () => {
  const find = lookup([org('renamed', 'acme.com', 'Gabriel personal')]);
  assert.equal(await find('acme.com'), undefined);
});
