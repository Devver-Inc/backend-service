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
  CreateRepoRequest,
  DeployRequest,
  DeployResponse,
  ErrorCode,
  ErrorResponse,
  LogsResponse,
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
        details: payload.found ? JSON.stringify(payload.found) : undefined,
      };
    }

    if (typeof payload.error === 'string') {
      return { message: payload.error };
    }

    if (payload.error && typeof payload.error === 'object') {
      return {
        code: payload.error.code as ErrorCode,
        message: payload.error.message,
        details: payload.error.details,
        logs: payload.error.logs,
        step: payload.error.step,
        stage: payload.error.stage,
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
            ? ErrorCode.UNAUTHORIZED
            : (parsed.code ?? fallbackCode),
        message,
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
      this.handleError(err, ErrorCode.REPO_CREATE_FAILED);
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
      this.handleError(err, ErrorCode.REPO_DELETE_FAILED);
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
      this.handleError(err, ErrorCode.DEPLOY_ERROR);
    }
  }

  async removeDeployment(
    agentUrl: string,
    repository: string,
    branch: string,
  ): Promise<void> {
    try {
      await firstValueFrom(
        this.httpService.delete(
          `${agentUrl}/deployments/${encodeURIComponent(repository)}/${encodeURIComponent(branch)}`,
          { headers: this.headers },
        ),
      );
    } catch (err) {
      this.handleError(err, ErrorCode.DEPLOYMENT_DELETE_FAILED);
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
      this.handleError(err, ErrorCode.LOGS_FETCH_FAILED);
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
      this.handleError(err, ErrorCode.PM2_START_FAILED);
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
      this.handleError(err, ErrorCode.PM2_STOP_FAILED);
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
      this.handleError(err, ErrorCode.PM2_RESTART_FAILED);
    }
  }
}
