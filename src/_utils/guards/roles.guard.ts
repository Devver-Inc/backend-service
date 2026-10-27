import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from 'src/_utils/constants';
import { UserRoleEnum } from 'src/logto/_utils/enums/permissions.enum';
import { AuthInfo } from 'src/logto/_utils/types/auth-info.types';
import { ProtectOptions } from '../decorators/protect.decorator';

/** Roles come from the token's `organizations` claim: no Logto call. */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<ProtectOptions>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    )?.roles;
    if (!required?.length) return true;

    const auth = context.switchToHttp().getRequest().auth as AuthInfo;
    if (
      auth.selectedOrganizationRoles.some((role) =>
        required.includes(role.roleName as UserRoleEnum),
      )
    ) {
      return true;
    }
    throw new ForbiddenException(
      'Insufficient permissions or roles to access this resource',
    );
  }
}
