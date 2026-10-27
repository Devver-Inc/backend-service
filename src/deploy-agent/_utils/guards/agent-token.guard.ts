import { timingSafeEqual } from 'node:crypto';
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { EnvironmentVariables } from 'src/_utils/config/env.config';
import { agentToken } from 'src/_utils/functions/project-keys.function';

/** Lets a project's agent in with its own DEVVER_SECRET, for that project only. */
@Injectable()
export class AgentTokenGuard implements CanActivate {
  constructor(
    private readonly configService: ConfigService<EnvironmentVariables, true>,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const received = request.headers['x-devver-secret'];
    const expected = agentToken(
      this.configService.get('DEPLOY_AGENT').DEPLOY_AGENT_SECRET,
      String(request.params.projectId),
    );
    if (
      typeof received !== 'string' ||
      received.length !== expected.length ||
      !timingSafeEqual(Buffer.from(received), Buffer.from(expected))
    ) {
      throw new UnauthorizedException('Invalid agent token');
    }
    return true;
  }
}
