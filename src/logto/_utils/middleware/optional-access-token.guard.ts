import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { LogtoService } from '../../logto.service';

@Injectable()
export class OptionalAccessTokenGuard implements CanActivate {
  constructor(private readonly logtoService: LogtoService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    try {
      const token = this.logtoService.extractBearerTokenFromHeaders(
        request.headers,
      );
      const payload = await this.logtoService.validateJwt(token);
      const authInfo = await this.logtoService.createAuthInfo(payload);
      request.auth = authInfo;
    } catch {
      request.auth = null;
    }

    return true;
  }
}
