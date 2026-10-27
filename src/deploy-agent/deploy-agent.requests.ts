import {
  HttpException,
  HttpStatus,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EnvironmentVariables } from 'src/_utils/config/env.config';
import {
  agentToken,
  agentUrl,
} from 'src/_utils/functions/project-keys.function';
import {
  AgentError,
  DeploymentAction,
  DeploymentStatus,
  PutDeploymentBody,
} from './_utils/types/agent.types';

const REQUEST_TIMEOUT_MS = 30_000;

@Injectable()
export class DeployAgentRequests {
  private readonly secret: string;

  constructor(configService: ConfigService<EnvironmentVariables, true>) {
    this.secret = configService.get('DEPLOY_AGENT').DEPLOY_AGENT_SECRET;
  }

  putRepo = (projectId: string, name: string): Promise<void> =>
    this.call(projectId, 'POST', `/repos/${name}`).then(() => {});

  deleteRepo = (projectId: string, name: string): Promise<void> =>
    this.call(projectId, 'DELETE', `/repos/${name}`).then(() => {});

  listDeployments = (projectId: string): Promise<DeploymentStatus[]> =>
    this.call(projectId, 'GET', '/deployments').then((res) => res.json());

  deleteDeployment = (projectId: string, id: string): Promise<void> =>
    this.call(projectId, 'DELETE', `/deployments/${id}`).then(() => {});

  control = (
    projectId: string,
    id: string,
    action: DeploymentAction,
  ): Promise<void> =>
    this.call(projectId, 'POST', `/deployments/${id}/${action}`).then(() => {});

  getLogs = (projectId: string, id: string, tail: number): Promise<string> =>
    this.call(projectId, 'GET', `/deployments/${id}/logs?tail=${tail}`).then(
      (res) => res.text(),
    );

  health = (projectId: string): Promise<boolean> =>
    this.call(projectId, 'GET', '/health').then(
      () => true,
      () => false,
    );

  /** Resolves once the agent answers 200; the body is the SSE stream of the deploy. */
  putDeployment = (
    projectId: string,
    id: string,
    body: PutDeploymentBody,
  ): Promise<Response> =>
    this.call(projectId, 'PUT', `/deployments/${id}`, body, false);

  /**
   * Passes the agent's own status and `{ code, message, logs }` through. A
   * 5xx or an auth failure from the agent becomes 502, so it never reads as
   * the caller's fault.
   */
  private async call(
    projectId: string,
    method: string,
    path: string,
    body?: unknown,
    timeout = true,
  ): Promise<Response> {
    const res = await fetch(`${agentUrl(projectId)}${path}`, {
      method,
      headers: {
        'x-devver-secret': agentToken(this.secret, projectId),
        ...(body !== undefined && { 'Content-Type': 'application/json' }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: timeout ? AbortSignal.timeout(REQUEST_TIMEOUT_MS) : undefined,
    }).catch(() => {
      throw new ServiceUnavailableException({
        code: 'AGENT_UNREACHABLE',
        message: 'Deploy agent unreachable',
      });
    });
    if (res.ok) return res;

    const error: AgentError = await res
      .json()
      .catch(() => ({ code: 'AGENT_ERROR', message: res.statusText }));
    const status =
      res.status >= 500 || res.status === 401 || res.status === 403
        ? HttpStatus.BAD_GATEWAY
        : res.status;
    throw new HttpException(error, status);
  }
}
