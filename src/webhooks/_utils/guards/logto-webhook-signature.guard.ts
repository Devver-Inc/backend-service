import { createHmac, timingSafeEqual } from 'node:crypto';
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  RawBodyRequest,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { ConfigService } from '@nestjs/config';
import { EnvironmentVariables } from 'src/_utils/config/env.config';

@Injectable()
export class LogtoWebhookSignatureGuard implements CanActivate {
  constructor(
    private readonly configService: ConfigService<EnvironmentVariables, true>,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context
      .switchToHttp()
      .getRequest<RawBodyRequest<Request>>();
    const signature = request.headers['logto-signature-sha-256'];
    // Signed bytes, not a re-serialization of the parsed body (main.ts sets rawBody).
    const body = request.rawBody;

    if (typeof signature !== 'string' || !body) {
      throw new UnauthorizedException('Missing webhook signature');
    }

    const isValid = this.verifySignature(body, signature);

    if (!isValid) {
      throw new UnauthorizedException('Invalid webhook signature');
    }

    return true;
  }

  private verifySignature(payload: Buffer, signature: string): boolean {
    const signingKey =
      this.configService.get('LOGTO').LOGTO_WEBHOOK_SIGNING_KEY;

    if (!signingKey) {
      throw new Error('LOGTO_WEBHOOK_SIGNING_KEY is not configured');
    }

    const expectedSignature = createHmac('sha256', signingKey)
      .update(payload)
      .digest('hex');

    try {
      const signatureBuffer = Buffer.from(signature, 'hex');
      const expectedBuffer = Buffer.from(expectedSignature, 'hex');

      if (signatureBuffer.length !== expectedBuffer.length) {
        return false;
      }

      return timingSafeEqual(signatureBuffer, expectedBuffer);
    } catch {
      return false;
    }
  }
}
