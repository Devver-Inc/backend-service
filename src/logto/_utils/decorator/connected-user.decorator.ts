import {
  BadRequestException,
  createParamDecorator,
  ExecutionContext,
} from '@nestjs/common';
import { UserRoleEnum } from '../enums/permissions.enum';
import {
  LogtoOrganization,
  LogtoUser,
} from '../types/responses/responses.type';
import { LogtoUserWithOrganizations } from '../types/user-with-organization.type';
import { LogtoUserClaimOrganizationRole } from '../schemas/logto-payload.types';

export const ConnectedUser = createParamDecorator(
  (_, ctx: ExecutionContext): LogtoUser => {
    const user = ctx.switchToHttp().getRequest().auth.user;
    if (!user)
      throw new BadRequestException('user not found in context of request');
    return user;
  },
);

export const ConnectedUserOrganizationOrNull = createParamDecorator(
  (_, ctx: ExecutionContext): LogtoOrganization | null =>
    ctx.switchToHttp().getRequest().auth.organization,
);

export const ConnectedUserWithOrgs = createParamDecorator(
  (_, ctx: ExecutionContext): LogtoUserWithOrganizations => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.auth.user;
    const currentOrganization = request.auth.selectedOrganization;
    const organizations = request.auth.organizations;

    if (!user)
      throw new BadRequestException('user not found in context of request');

    const selectedOrganizationRoles: LogtoUserClaimOrganizationRole[] =
      request.auth.selectedOrganizationRoles ?? [];

    return {
      ...user,
      currentOrganization: currentOrganization || null,
      organizations: organizations || [],
      selectedOrganizationRoles,
      isAdmin: selectedOrganizationRoles.some(
        (r) => r.roleName === UserRoleEnum.ADMIN,
      ),
    };
  },
);
