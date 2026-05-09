import {
  BadRequestException,
  HttpStatus,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { AxiosError, isAxiosError } from 'axios';
import { firstValueFrom } from 'rxjs';
import { EnvironmentVariables } from 'src/_utils/config/env.config';
import {
  AgentDeploymentListItem,
  AgentErrorCode,
  BackendErrorCode,
  CreateRepoRequest,
  DeployRequest,
  DeployResponse,
  DeployStage,
  ErrorCode,
  ErrorResponse,
  LogsResponse,
  MongoDatabaseResponse,
  PM2ActionResponse,
  RepoResponse,
} from './_utils/types/agent.types';

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

  private getStatusCode(error: AxiosError): number {
    return error.response?.status ?? HttpStatus.INTERNAL_SERVER_ERROR;
  }

  private parseErrorPayload(data: unknown): Partial<ErrorResponse['error']> {
    if (!data || typeof data !== 'object') return {};

    const payload = data as {
      type?: string;
      on?: string;
      found?: unknown;
      error?:
        | string
        | {
            code?: string;
            message?: string;
            details?: string;
            logs?: string;
            step?: number;
            stage?: string;
            service?: string;
            rollback?: {
              attempted?: boolean;
              success?: boolean;
              message?: string;
            };
          };
      message?: string;
    };

    if (payload.type === 'validation') {
      return {
        message: `Validation failed on ${payload.on}`,
      };
    }

    if (typeof payload.error === 'string') {
      return { message: payload.error };
    }

    if (payload.error && typeof payload.error === 'object') {
      return {
        code: payload.error.code as AgentErrorCode,
        message: payload.error.message,
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

    if (payload.message) {
      return { message: payload.message };
    }

    return {};
  }

  private buildStructuredError(
    err: AxiosError,
    fallbackCode: ErrorCode,
  ): ErrorResponse {
    const statusCode = this.getStatusCode(err);
    const parsed = this.parseErrorPayload(err.response?.data);
    const message =
      parsed.message ?? err.message ?? 'Deploy agent request failed';

    return {
      success: false,
      error: {
        code:
          statusCode === HttpStatus.UNAUTHORIZED
            ? BackendErrorCode.UNAUTHORIZED
            : (parsed.code ?? fallbackCode),
        message,
        logs: parsed.logs,
        step: parsed.step,
        stage: parsed.stage,
        service: parsed.service,
        rollback: parsed.rollback,
      },
      duration: 0,
    };
  }

  private handleError(err: unknown, fallbackCode: ErrorCode): never {
    if (isAxiosError(err) && err.response) {
      const structuredError = this.buildStructuredError(err, fallbackCode);
      switch (err.response.status) {
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

    throw new ServiceUnavailableException({
      success: false,
      error: {
        code: fallbackCode,
        message: 'Deploy agent unreachable',
      },
      duration: 0,
    });
  }

  async createRepo(
    agentUrl: string,
    body: CreateRepoRequest,
  ): Promise<RepoResponse> {
    try {
      const { data } = await firstValueFrom(
        this.httpService.post<RepoResponse>(`${agentUrl}/repos`, body, {
          headers: this.headers,
        }),
      );
      return data;
    } catch (err) {
      throw this.handleError(err, BackendErrorCode.REPO_CREATE_FAILED);
    }
  }

  async deleteRepo(agentUrl: string, name: string): Promise<void> {
    try {
      await firstValueFrom(
        this.httpService.delete(
          `${agentUrl}/repos/${encodeURIComponent(name)}`,
          { headers: this.headers },
        ),
      );
    } catch (err) {
      throw this.handleError(err, BackendErrorCode.REPO_DELETE_FAILED);
    }
  }

  async listDeployments(agentUrl: string): Promise<AgentDeploymentListItem[]> {
    try {
      const { data } = await firstValueFrom(
        this.httpService.get<AgentDeploymentListItem[]>(
          `${agentUrl}/deployments`,
          { headers: this.headers },
        ),
      );
      return data;
    } catch (err) {
      throw this.handleError(err, AgentErrorCode.DEPLOY_ERROR);
    }
  }

  async listMongoDatabases(
    agentUrl: string,
  ): Promise<MongoDatabaseResponse[]> {
    try {
      const { data } = await firstValueFrom(
        this.httpService.get<MongoDatabaseResponse[]>(
          `${agentUrl}/mongo/databases`,
          { headers: this.headers },
        ),
      );
      return data;
    } catch (err) {
      throw this.handleError(
        err,
        BackendErrorCode.MONGO_DATABASES_FETCH_FAILED,
      );
    }
  }

  async deploy(agentUrl: string, body: DeployRequest): Promise<DeployResponse> {
    try {
      const { data } = await firstValueFrom(
        this.httpService.post<DeployResponse>(`${agentUrl}/deploy`, body, {
          headers: this.headers,
        }),
      );
      return data;
    } catch (err) {
      throw this.handleError(err, AgentErrorCode.DEPLOY_ERROR);
    }
  }

  async removeDeployment(
    agentUrl: string,
    deploymentId: string,
  ): Promise<void> {
    try {
      await firstValueFrom(
        this.httpService.delete(
          `${agentUrl}/deployments/${encodeURIComponent(deploymentId)}`,
          { headers: this.headers },
        ),
      );
    } catch (err) {
      throw this.handleError(err, BackendErrorCode.DEPLOYMENT_DELETE_FAILED);
    }
  }

  async getLogs(agentUrl: string, deploymentId: string): Promise<LogsResponse> {
    try {
      const { data } = await firstValueFrom(
        this.httpService.get<LogsResponse>(
          `${agentUrl}/logs/${encodeURIComponent(deploymentId)}`,
          { headers: this.headers },
        ),
      );
      return data;
    } catch (err) {
      throw this.handleError(err, BackendErrorCode.LOGS_FETCH_FAILED);
    }
  }

  async startProcess(
    agentUrl: string,
    name: string,
  ): Promise<PM2ActionResponse> {
    try {
      const { data } = await firstValueFrom(
        this.httpService.post<PM2ActionResponse>(
          `${agentUrl}/pm2/start`,
          { name },
          { headers: this.headers },
        ),
      );
      return data;
    } catch (err) {
      throw this.handleError(err, BackendErrorCode.PM2_START_FAILED);
    }
  }

  async stopProcess(
    agentUrl: string,
    name: string,
  ): Promise<PM2ActionResponse> {
    try {
      const { data } = await firstValueFrom(
        this.httpService.post<PM2ActionResponse>(
          `${agentUrl}/pm2/stop`,
          { name },
          { headers: this.headers },
        ),
      );
      return data;
    } catch (err) {
      throw this.handleError(err, BackendErrorCode.PM2_STOP_FAILED);
    }
  }

  async restartProcess(
    agentUrl: string,
    name: string,
  ): Promise<PM2ActionResponse> {
    try {
      const { data } = await firstValueFrom(
        this.httpService.post<PM2ActionResponse>(
          `${agentUrl}/pm2/restart`,
          { name },
          { headers: this.headers },
        ),
      );
      return data;
    } catch (err) {
      throw this.handleError(err, BackendErrorCode.PM2_RESTART_FAILED);
    }
  }
}
