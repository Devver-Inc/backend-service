import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

import { LogtoService } from '../../logto.service';
import { ErrorCodes } from 'src/_utils/enums/error-codes.enum';

@Injectable()
export class AccessTokenGuard implements CanActivate {
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
      return true;
    } catch (error: unknown) {
      const status =
        error != null && typeof error === 'object' && 'status' in error
          ? (error as { status: number }).status
          : undefined;
      if (status === 403) {
        throw new ForbiddenException(ErrorCodes.FORBIDDEN);
      }
      throw new UnauthorizedException(ErrorCodes.UNAUTHORIZED);
    }
  }
}
