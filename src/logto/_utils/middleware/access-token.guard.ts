import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from 'src/_utils/constants';
import { ErrorCodes } from 'src/_utils/enums/error-codes.enum';
import { LogtoService } from '../../logto.service';

/**
 * Global guard: every route needs a valid Logto token unless marked
 * @Public(). Public routes still get `request.auth` when a valid token is
 * sent (comments use it), and `null` otherwise.
 */
@Injectable()
export class AccessTokenGuard implements CanActivate {
  constructor(
    private readonly logtoService: LogtoService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    try {
      const token = this.logtoService.extractBearerTokenFromHeaders(
        request.headers,
      );
      const payload = await this.logtoService.validateJwt(token);
      request.auth = await this.logtoService.createAuthInfo(payload);
      return true;
    } catch (error: unknown) {
      if (isPublic) {
        request.auth = null;
        return true;
      }
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
