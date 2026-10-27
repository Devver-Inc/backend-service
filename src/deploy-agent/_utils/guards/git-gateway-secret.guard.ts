import { timingSafeEqual } from 'node:crypto';
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EnvironmentVariables } from 'src/_utils/config/env.config';

@Injectable()
export class GitGatewaySecretGuard implements CanActivate {
  constructor(
    private readonly configService: ConfigService<EnvironmentVariables, true>,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const expected = this.configService.get('DEPLOY_AGENT').GIT_GATEWAY_SECRET;
    if (!expected) {
      throw new ServiceUnavailableException('Git gateway is not configured');
    }

    const received = context.switchToHttp().getRequest().headers[
      'x-git-gateway-secret'
    ];
    if (typeof received !== 'string' || !this.matches(received, expected)) {
      throw new UnauthorizedException('Invalid git gateway secret');
    }
    return true;
  }

  private matches(received: string, expected: string): boolean {
    const a = Buffer.from(received);
    const b = Buffer.from(expected);
    return a.length === b.length && timingSafeEqual(a, b);
  }
}
