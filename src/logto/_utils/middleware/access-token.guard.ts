import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common'

import { LogtoService } from '../../logto.service'

@Injectable()
export class AccessTokenGuard implements CanActivate {
  constructor(private readonly logtoService: LogtoService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest()

    try {
      const token = this.logtoService.extractBearerTokenFromHeaders(request.headers)
      const payload = await this.logtoService.validateJwt(token)
      const authInfo = await this.logtoService.createAuthInfo(payload)
      request.auth = authInfo
      return true
    } catch (error) {
      if (error.status === 401) throw new UnauthorizedException(error.message || 'Unauthorized')
      throw new ForbiddenException(error.message)
    }
  }
}
