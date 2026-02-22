import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { AxiosError } from 'axios';
import { firstValueFrom } from 'rxjs';
import { EnvironmentVariables } from 'src/_utils/config/env.config';
import {
  CreateRepoRequest,
  DeployRequest,
  DeployResponse,
  ErrorResponse,
  LogsResponse,
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

  private handleError(err: unknown): never {
    if (err instanceof AxiosError && err.response) {
      const message: string = err.response.data?.error ?? err.message;
      switch (err.response.status) {
        case 401:
          throw new UnauthorizedException(message);
        case 404:
          throw new NotFoundException(message);
        case 400:
          throw new BadRequestException(message);
        default:
          if (err.response.status >= 500)
            throw new InternalServerErrorException(message);
          throw new BadRequestException(message);
      }
    }
    throw new InternalServerErrorException('Deploy agent unreachable');
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
      this.handleError(err);
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
      this.handleError(err);
    }
  }

  async deploy(
    agentUrl: string,
    body: DeployRequest,
  ): Promise<DeployResponse | ErrorResponse> {
    try {
      const { data } = await firstValueFrom(
        this.httpService.post<DeployResponse | ErrorResponse>(
          `${agentUrl}/deploy`,
          body,
          { headers: this.headers },
        ),
      );
      return data;
    } catch (err) {
      this.handleError(err);
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
      this.handleError(err);
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
      this.handleError(err);
    }
  }
}
