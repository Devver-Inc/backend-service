import { ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { UserDocument } from 'src/users/user.schema';
import { RoleEnum } from "src/_utils/enums/role.enum";

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    return (super.canActivate(context) as any).then((x: any) => {
      if (!x) return x;
      const roles = this.reflector.get<RoleEnum[]>('roles', context.getHandler());
      if (!roles || !roles.length) return x;
      const request = context.switchToHttp().getRequest();
      const user: UserDocument = request.user;
      return roles.includes(user.role);
    });
  }

  handleRequest(err: any, user: any, info: any, context: any, status: any) {
    if (info && info.message === 'jwt expired') throw new ForbiddenException('TOKEN_EXPIRED');
    return super.handleRequest(err, user, info, context, status);
  }
}
