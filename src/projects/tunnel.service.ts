import {
  HttpException,
  Injectable,
  Logger,
  OnApplicationBootstrap,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { IncomingMessage, STATUS_CODES } from 'node:http';
import { connect, Socket } from 'node:net';
import { Duplex } from 'node:stream';
import { createWebSocketStream, WebSocket, WebSocketServer } from 'ws';
import { projectNamespace } from 'src/_utils/functions/project-keys.function';
import { userWithOrganizations } from 'src/logto/_utils/decorator/connected-user.decorator';
import { LogtoUserWithOrganizations } from 'src/logto/_utils/types/user-with-organization.type';
import { LogtoService } from 'src/logto/logto.service';
import { DatabasesService } from './databases.service';
import { databaseHost, databasePort } from './infrastructure/database-engines';
import { DatabaseType } from './project.types';
import { ProjectsService } from './projects.service';

const PATH =
  /^\/api\/v1\/projects\/([0-9a-f]{24})\/databases\/(mongo|postgres|valkey)\/tunnel$/;
const PING_MS = 30_000;
const IDLE_MS = 30 * 60_000;
const CONNECT_TIMEOUT_MS = 10_000;
const MAX_PER_USER = 10;

/**
 * `devver db connect`: one WebSocket per local TCP connection, its bytes
 * copied to the database's Service. Authenticated like any route (Logto
 * bearer token), nothing is stored, so any replica takes the connection.
 */
@Injectable()
export class TunnelService implements OnApplicationBootstrap {
  private readonly logger = new Logger(TunnelService.name);
  private readonly wss = new WebSocketServer({ noServer: true });
  // ponytail: per replica, so a user may hold MAX_PER_USER on each one.
  private readonly openByUser = new Map<string, number>();

  constructor(
    private readonly adapterHost: HttpAdapterHost,
    private readonly logtoService: LogtoService,
    private readonly projectsService: ProjectsService,
    private readonly databasesService: DatabasesService,
  ) {}

  onApplicationBootstrap(): void {
    this.adapterHost.httpAdapter
      .getHttpServer()
      .on(
        'upgrade',
        (request: IncomingMessage, client: Duplex, head: Buffer) =>
          void this.handle(request, client, head),
      );
  }

  protected target(
    projectId: string,
    type: DatabaseType,
  ): { host: string; port: number } {
    return {
      host: `${databaseHost(projectId, type)}.${projectNamespace(projectId)}.svc.cluster.local`,
      port: databasePort(type),
    };
  }

  async handle(
    request: IncomingMessage,
    client: Duplex,
    head: Buffer,
  ): Promise<void> {
    const match = PATH.exec(new URL(request.url ?? '/', 'http://x').pathname);
    if (!match) return refuse(client, 404);
    const projectId = match[1];
    const type = match[2] as DatabaseType;

    let user: LogtoUserWithOrganizations | null;
    try {
      user = userWithOrganizations(
        await this.logtoService.createAuthInfo(
          await this.logtoService.validateJwt(
            this.logtoService.extractBearerTokenFromHeaders(request.headers),
          ),
        ),
      );
    } catch (error) {
      return refuse(client, statusOf(error) === 403 ? 403 : 401);
    }
    if (!user) return refuse(client, 401);
    try {
      const project = await this.projectsService.assertProjectAccess(
        projectId,
        user,
      );
      this.databasesService.assertCanConnect(project, type, user);
    } catch (error) {
      return refuse(client, statusOf(error) ?? 500);
    }
    const userId = user.id;
    if ((this.openByUser.get(userId) ?? 0) >= MAX_PER_USER) {
      return refuse(client, 429);
    }

    const { host, port } = this.target(projectId, type);
    const upstream = await reach(host, port).catch(() => undefined);
    if (!upstream) return refuse(client, 502);
    this.wss.handleUpgrade(request, client, head, (ws) =>
      this.pipe(ws, upstream, userId, `${projectId}/${type}`),
    );
  }

  private pipe(
    ws: WebSocket,
    upstream: Socket,
    userId: string,
    label: string,
  ): void {
    this.openByUser.set(userId, (this.openByUser.get(userId) ?? 0) + 1);
    this.logger.log(`tunnel opened by ${userId} to ${label}`);
    const stream = createWebSocketStream(ws);
    const ping = setInterval(() => ws.ping(), PING_MS);
    upstream.setTimeout(IDLE_MS, () => upstream.destroy());

    let closed = false;
    const close = () => {
      if (closed) return;
      closed = true;
      clearInterval(ping);
      stream.destroy();
      upstream.destroy();
      this.openByUser.set(userId, (this.openByUser.get(userId) ?? 1) - 1);
      this.logger.log(`tunnel closed by ${userId} to ${label}`);
    };
    stream.on('error', close).on('close', close);
    upstream.on('error', close).on('close', close);
    stream.pipe(upstream).pipe(stream);
  }
}

const statusOf = (error: unknown): number | undefined =>
  error instanceof HttpException
    ? error.getStatus()
    : error != null && typeof error === 'object' && 'status' in error
      ? Number((error as { status: unknown }).status)
      : undefined;

function refuse(client: Duplex, status: number): void {
  client.end(
    `HTTP/1.1 ${status} ${STATUS_CODES[status]}\r\nConnection: close\r\nContent-Length: 0\r\n\r\n`,
  );
}

function reach(host: string, port: number): Promise<Socket> {
  return new Promise((resolve, reject) => {
    const socket = connect({ host, port, timeout: CONNECT_TIMEOUT_MS });
    socket.once('connect', () => {
      socket.setTimeout(0);
      resolve(socket);
    });
    socket.once('timeout', () => socket.destroy(new Error('timeout')));
    socket.once('error', reject);
  });
}
