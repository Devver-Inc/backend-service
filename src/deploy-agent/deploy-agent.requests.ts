import {
  BadRequestException,
  HttpStatus,
  HttpException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { AxiosError, isAxiosError, Method } from 'axios';
import { firstValueFrom } from 'rxjs';
import { EnvironmentVariables } from 'src/_utils/config/env.config';
import {
  AgentDeploymentListItem,
  AgentErrorPayload,
  AgentErrorCode,
  BackendErrorCode,
  CreateRepoRequest,
  DeployPhaseEvent,
  DeployRequest,
  DeployResponse,
  DeploySseEvent,
  DeployStage,
  DeployStreamCallbacks,
  ErrorCode,
  ErrorResponse,
  LogsResponse,
  DatabaseResponse,
  PM2ActionResponse,
  CreateRepoAgentResponse,
} from './_utils/types/agent.types';
import { DatabaseType } from 'src/projects/project.types';

@Injectable()
export class DeployAgentRequests {
  private readonly secret: string;

  constructor(
    private readonly httpService: HttpService,
    configService: ConfigService<EnvironmentVariables, true>,
  ) {
    this.secret = configService.get('DEPLOY_AGENT').DEPLOY_AGENT_SECRET;
  }

  private get headers(): Record<string, string> {
    return { 'x-devver-secret': this.secret };
  }

  private async request<T>(
    method: Method,
    url: string,
    fallbackCode: ErrorCode,
    body?: unknown,
  ): Promise<T> {
    try {
      const { data } = await firstValueFrom(
        this.httpService.request<T>({
          method,
          url,
          data: body,
          headers: this.headers,
        }),
      );
      return data;
    } catch (err) {
      throw this.handleError(err, fallbackCode);
    }
  }

  createRepo(
    agentUrl: string,
    body: CreateRepoRequest,
  ): Promise<CreateRepoAgentResponse> {
    return this.request(
      'post',
      `${agentUrl}/repos`,
      BackendErrorCode.REPO_CREATE_FAILED,
      body,
    );
  }

  deleteRepo(agentUrl: string, name: string): Promise<void> {
    return this.request(
      'delete',
      `${agentUrl}/repos/${encodeURIComponent(name)}`,
      BackendErrorCode.REPO_DELETE_FAILED,
    );
  }

  listDeployments(
    agentUrl: string,
    repo?: string,
  ): Promise<AgentDeploymentListItem[]> {
    return this.request(
      'get',
      `${agentUrl}/deployments${repo ? `?repo=${encodeURIComponent(repo)}` : ''}`,
      AgentErrorCode.DEPLOY_ERROR,
    );
  }

  deploy(
    agentUrl: string,
    body: DeployRequest,
  ): Promise<DeployResponse | ErrorResponse> {
    return this.request(
      'post',
      `${agentUrl}/deploy`,
      AgentErrorCode.DEPLOY_ERROR,
      body,
    );
  }

  removeDeployment(agentUrl: string, deploymentId: string): Promise<void> {
    return this.request(
      'delete',
      `${agentUrl}/deployments/${encodeURIComponent(deploymentId)}`,
      BackendErrorCode.DEPLOYMENT_DELETE_FAILED,
    );
  }

  getLogs(agentUrl: string, deploymentId: string): Promise<LogsResponse> {
    return this.request(
      'get',
      `${agentUrl}/logs/${encodeURIComponent(deploymentId)}`,
      BackendErrorCode.LOGS_FETCH_FAILED,
    );
  }

  listDatabases(
    agentUrl: string,
    engine: DatabaseType,
  ): Promise<DatabaseResponse[]> {
    return this.request(
      'get',
      `${agentUrl}/databases/${engine}`,
      BackendErrorCode.DATABASES_FETCH_FAILED,
    );
  }

  startProcess(agentUrl: string, name: string): Promise<PM2ActionResponse> {
    return this.request(
      'post',
      `${agentUrl}/pm2/start`,
      BackendErrorCode.PM2_START_FAILED,
      { name },
    );
  }

  stopProcess(agentUrl: string, name: string): Promise<PM2ActionResponse> {
    return this.request(
      'post',
      `${agentUrl}/pm2/stop`,
      BackendErrorCode.PM2_STOP_FAILED,
      { name },
    );
  }

  restartProcess(agentUrl: string, name: string): Promise<PM2ActionResponse> {
    return this.request(
      'post',
      `${agentUrl}/pm2/restart`,
      BackendErrorCode.PM2_RESTART_FAILED,
      { name },
    );
  }

  async deployStream(
    agentUrl: string,
    body: DeployRequest,
    callbacks: DeployStreamCallbacks,
    signal?: AbortSignal,
  ): Promise<DeployResponse | ErrorResponse> {
    let response: Response;
    try {
      response = await fetch(`${agentUrl}/deploy/stream`, {
        method: 'POST',
        headers: { ...this.headers, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal,
      });
    } catch (err) {
      throw this.handleError(err, AgentErrorCode.DEPLOY_ERROR);
    }

    if (!response.ok) {
      const payload = await this.parseFetchErrorPayload(response);
      this.throwStructuredError(
        response.status,
        this.buildStructuredErrorFromPayload(
          response.status,
          payload,
          AgentErrorCode.DEPLOY_ERROR,
          response.statusText || 'Deploy agent request failed',
        ),
      );
    }

    if (!response.body) {
      throw new ServiceUnavailableException({
        success: false,
        error: {
          code: AgentErrorCode.DEPLOY_ERROR,
          message: 'Deploy agent stream did not include a response body',
        },
        duration: 0,
      });
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const blocks = buffer.split(/\r?\n\r?\n/);
        buffer = blocks.pop() ?? '';

        for (const block of blocks) {
          const terminalEvent = await this.handleSseBlock(block, callbacks);
          if (terminalEvent) {
            await reader.cancel();
            return terminalEvent;
          }
        }
      }

      buffer += decoder.decode();
      if (buffer.trim()) {
        const terminalEvent = await this.handleSseBlock(buffer, callbacks);
        if (terminalEvent) return terminalEvent;
      }
    } catch (err) {
      if (signal?.aborted) throw err;
      throw new ServiceUnavailableException({
        success: false,
        error: {
          code: AgentErrorCode.DEPLOY_ERROR,
          message:
            err instanceof Error
              ? err.message
              : 'Failed to read deploy agent stream',
        },
        duration: 0,
      });
    } finally {
      reader.releaseLock();
    }

    throw new ServiceUnavailableException({
      success: false,
      error: {
        code: AgentErrorCode.DEPLOY_ERROR,
        message: 'Deploy agent stream ended before completion',
      },
      duration: 0,
    });
  }

  private parseSseBlock(block: string): DeploySseEvent | undefined {
    const dataLines: string[] = [];
    let eventName: string | undefined;

    for (const line of block.split(/\r?\n/)) {
      if (line.startsWith('event:')) {
        eventName = line.slice('event:'.length).trim();
      } else if (line.startsWith('data:')) {
        dataLines.push(line.slice('data:'.length).trimStart());
      }
    }

    if (!eventName || dataLines.length === 0) return undefined;

    const data = JSON.parse(dataLines.join('\n')) as unknown;

    if (eventName === 'phase')
      return { event: eventName, data: data as DeployPhaseEvent };
    if (eventName === 'complete')
      return { event: eventName, data: data as DeployResponse };
    if (eventName === 'error')
      return { event: eventName, data: data as ErrorResponse };
    return undefined;
  }

  private async handleSseBlock(
    block: string,
    callbacks: DeployStreamCallbacks,
  ): Promise<DeployResponse | ErrorResponse | undefined> {
    const parsed = this.parseSseBlock(block);
    if (!parsed) return undefined;

    switch (parsed.event) {
      case 'phase':
        await callbacks.onPhase?.(parsed.data);
        return undefined;
      case 'complete':
        await callbacks.onComplete?.(parsed.data);
        return parsed.data;
      case 'error':
        await callbacks.onError?.(parsed.data);
        return parsed.data;
    }
  }

  private getStatusCode(error: AxiosError): number {
    return error.response?.status ?? HttpStatus.INTERNAL_SERVER_ERROR;
  }

  private parseErrorPayload(data: unknown): Partial<ErrorResponse['error']> {
    if (!data || typeof data !== 'object') return {};

    const payload = data as AgentErrorPayload;

    if (payload.error && typeof payload.error === 'object') {
      return {
        code: payload.error.code,
        message: payload.error.message,
        details: payload.error.details,
        logs: payload.error.logs,
        step: payload.error.step,
        stage: payload.error.stage as DeployStage | undefined,
        service: payload.error.service,
        rollback:
          payload.error.rollback?.attempted !== undefined &&
          payload.error.rollback?.success !== undefined
            ? {
                attempted: payload.error.rollback.attempted,
                success: payload.error.rollback.success,
                message: payload.error.rollback.message,
              }
            : undefined,
      };
    }
    return {};
  }

  private buildStructuredErrorFromPayload(
    statusCode: number,
    payload: unknown,
    fallbackCode: ErrorCode,
    fallbackMessage: string,
  ): ErrorResponse {
    const parsed = this.parseErrorPayload(payload);
    return {
      success: false,
      error: {
        code:
          statusCode === HttpStatus.UNAUTHORIZED
            ? BackendErrorCode.UNAUTHORIZED
            : (parsed.code ?? fallbackCode),
        message: parsed.message ?? fallbackMessage,
        details: parsed.details,
        logs: parsed.logs,
        step: parsed.step,
        stage: parsed.stage,
        service: parsed.service,
        rollback: parsed.rollback,
      },
      duration: 0,
    };
  }

  private buildStructuredError(
    err: AxiosError,
    fallbackCode: ErrorCode,
  ): ErrorResponse {
    return this.buildStructuredErrorFromPayload(
      this.getStatusCode(err),
      err.response?.data,
      fallbackCode,
      err.message ?? 'Deploy agent request failed',
    );
  }

  private throwStructuredError(
    statusCode: number,
    structuredError: ErrorResponse,
  ): never {
    switch (statusCode) {
      case HttpStatus.UNAUTHORIZED:
        throw new UnauthorizedException(structuredError);
      case HttpStatus.NOT_FOUND:
        throw new NotFoundException(structuredError);
      case HttpStatus.BAD_REQUEST:
        throw new BadRequestException(structuredError);
      case HttpStatus.UNPROCESSABLE_ENTITY:
        throw new UnprocessableEntityException(structuredError);
      case HttpStatus.INTERNAL_SERVER_ERROR:
        throw new InternalServerErrorException(structuredError);
      default:
        throw new ServiceUnavailableException(structuredError);
    }
  }

  private handleError(err: unknown, fallbackCode: ErrorCode): never {
    if (isAxiosError(err) && err.response) {
      this.throwStructuredError(
        err.response.status,
        this.buildStructuredError(err, fallbackCode),
      );
    }
    if (err instanceof HttpException) {
      this.throwStructuredError(err.getStatus(), {
        success: false,
        error: { code: fallbackCode, message: err.message },
        duration: 0,
      });
    }
    throw new ServiceUnavailableException({
      success: false,
      error: { code: fallbackCode, message: 'Deploy agent unreachable' },
      duration: 0,
    });
  }

  private async parseFetchErrorPayload(response: Response): Promise<unknown> {
    const text = await response.text();
    if (!text) return {};
    try {
      return JSON.parse(text);
    } catch {
      return { message: text };
    }
  }
}
