import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { ROLES_KEY } from "src/_utils/constants";
import { LogtoRequests } from "src/logto/logto.requests";
import { ProtectOptions } from "../decorators/protect.decorator";

import { AuthInfo } from "../types/auth-info.types";
import {
  UserRoleEnum,
  UserPermissionsEnum,
  UserRoles,
} from "src/logto/_utils/enums/permissions.enum";

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly logtoRequests: LogtoRequests,
  ) {}

  async canActivate(context: ExecutionContext) {
    const opts = this.reflector.getAllAndOverride<ProtectOptions>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    const request = context.switchToHttp().getRequest();

    if (
      (!opts?.roles && !opts?.permissions) ||
      (opts.roles?.length === 0 && opts.permissions?.length === 0)
    ) {
      return true;
    }

    const auth = request.auth as AuthInfo;
    const userRoles = auth.selectedOrganizationRoles;
    const userPermissions = await this.logtoRequests
      .getCurrentUserPermissions(auth.user.id, auth.selectedOrganization?.id)
      .then((permissions) => permissions.map((x) => x.name));

    const requiredRoles =
      opts?.roles && opts.roles.length > 0 ? new Set(opts.roles) : null;
    const requiredPermissions =
      opts?.permissions && opts.permissions.length > 0
        ? new Set(opts.permissions)
        : null;

    if (
      requiredRoles &&
      userRoles.some((role) => requiredRoles.has(role.roleName as UserRoleEnum))
    )
      return true;

    if (
      requiredPermissions &&
      userPermissions.some((perm) =>
        requiredPermissions.has(perm as UserPermissionsEnum),
      )
    )
      return true;

    if (requiredPermissions) {
      for (const role of userRoles) {
        const roleConfig = UserRoles[role.roleName as UserRoleEnum];
        if (
          roleConfig?.permissions?.some((perm: UserPermissionsEnum) =>
            requiredPermissions.has(perm),
          )
        ) {
          return true;
        }
      }
    }

    throw new ForbiddenException(
      "Insufficient permissions or roles to access this resource",
    );
  }
}
