import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac } from 'node:crypto';
import { jwtVerify, SignJWT } from 'jose';
import { EnvironmentVariables } from 'src/_utils/config/env.config';
import { GitTokenPayload } from '../_utils/types/git-authorization.types';

@Injectable()
export class GitTokenService {
  private readonly masterSecret: string;

  constructor(configService: ConfigService<EnvironmentVariables, true>) {
    this.masterSecret = configService.get('DEPLOY_AGENT').GIT_TOKEN_SECRET;
  }

  async generateToken(
    projectId: string,
    repo: string,
    userId: string,
  ): Promise<string> {
    return new SignJWT({ projectId, repo, userId })
      .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
      .setIssuer('devver-backend-service')
      .setAudience('devver-git')
      .setIssuedAt()
      .setExpirationTime('1h')
      .sign(this.projectKey(projectId));
  }

  async verifyToken(
    token: string,
    projectId: string,
  ): Promise<GitTokenPayload> {
    try {
      const { payload } = await jwtVerify(token, this.projectKey(projectId), {
        algorithms: ['HS256'],
        audience: 'devver-git',
        issuer: 'devver-backend-service',
      });
      if (
        typeof payload.projectId !== 'string' ||
        typeof payload.repo !== 'string' ||
        typeof payload.userId !== 'string' ||
        !Number.isInteger(payload.iat) ||
        !Number.isInteger(payload.exp)
      ) {
        throw new Error('Invalid payload');
      }
      return payload as unknown as GitTokenPayload;
    } catch {
      throw new UnauthorizedException('Invalid or expired git token');
    }
  }

  private projectKey(projectId: string): Uint8Array {
    return new TextEncoder().encode(
      createHmac('sha256', this.masterSecret)
        .update(`git-auth:${projectId}`)
        .digest('base64url'),
    );
  }
}
