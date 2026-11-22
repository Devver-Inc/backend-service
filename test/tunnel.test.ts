// Run: npm test
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createServer, Server } from 'node:http';
import { AddressInfo, createServer as createTcpServer } from 'node:net';
import { after, before, test } from 'node:test';
import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { WebSocket } from 'ws';
import { TunnelService } from 'src/projects/tunnel.service';

const PROJECT_ID = '6650a1b2c3d4e5f6a7b8c9d0';
const PATH = `/api/v1/projects/${PROJECT_ID}/databases/postgres/tunnel`;

let api: Server;
let apiPort: number;
let close: () => void;

before(async () => {
  const echo = createTcpServer((socket) => socket.pipe(socket)).listen(0);
  await once(echo, 'listening');
  const echoPort = (echo.address() as AddressInfo).port;

  const logto = {
    extractBearerTokenFromHeaders: (headers: { authorization?: string }) => {
      const token = headers.authorization?.replace(/^Bearer /, '');
      if (!token) throw new UnauthorizedException();
      return token;
    },
    validateJwt: async (token: string) => {
      if (!['dev', 'viewer'].includes(token)) throw new UnauthorizedException();
      return { sub: token };
    },
    createAuthInfo: async ({ sub }: { sub: string }) => ({
      user: { id: sub },
      selectedOrganization: { id: 'org' },
      organizations: [],
      selectedOrganizationRoles: [],
    }),
  };
  const projects = {
    assertProjectAccess: async () => ({ _id: PROJECT_ID }),
  };
  const databases = {
    assertCanConnect: (_: unknown, __: unknown, user: { id: string }) => {
      if (user.id !== 'dev') throw new ForbiddenException('PUSH_NOT_ALLOWED');
    },
  };
  class LocalTunnel extends TunnelService {
    protected target() {
      return { host: '127.0.0.1', port: echoPort };
    }
  }
  const tunnel = new LocalTunnel(
    {} as never,
    logto as never,
    projects as never,
    databases as never,
  );

  api = createServer().listen(0);
  await once(api, 'listening');
  apiPort = (api.address() as AddressInfo).port;
  api.on('upgrade', (request, socket, head) => {
    void tunnel.handle(request, socket, head);
  });
  close = () => {
    api.close();
    echo.close();
  };
});

after(() => close());

const open = (token?: string, path = PATH) =>
  new WebSocket(`ws://127.0.0.1:${apiPort}${path}`, {
    headers: token ? { authorization: `Bearer ${token}` } : {},
  });

const refusal = (ws: WebSocket) =>
  new Promise<number>((resolve) =>
    ws.on('unexpected-response', (_, res) => resolve(res.statusCode ?? 0)),
  );

test('a developer of the project reaches the database: bytes go both ways', async () => {
  const ws = open('dev');
  await once(ws, 'open');
  ws.send(Buffer.from('SELECT 1'));
  const [reply] = await once(ws, 'message');
  assert.equal(Buffer.from(reply as Buffer).toString(), 'SELECT 1');
  ws.close();
});

test('no token, a viewer, or another path: refused before any byte reaches the database', async () => {
  assert.equal(await refusal(open()), 401);
  assert.equal(await refusal(open('viewer')), 403);
  assert.equal(
    await refusal(open('dev', `/api/v1/projects/${PROJECT_ID}/tunnel`)),
    404,
  );
});
