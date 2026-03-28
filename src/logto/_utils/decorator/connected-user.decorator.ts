import {
  BadRequestException,
  createParamDecorator,
  ExecutionContext,
} from '@nestjs/common';
import { UserRoleEnum } from '../enums/permissions.enum';
import { LogtoUser } from '../types/responses/responses.type';
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

export const OptionalConnectedUserWithOrgs = createParamDecorator(
  (_, ctx: ExecutionContext): LogtoUserWithOrganizations | null => {
    const request = ctx.switchToHttp().getRequest();
    if (!request.auth) return null;

    const user = request.auth.user;

    if (!user) return null;

    const currentOrganization = request.auth.selectedOrganization;
    const organizations = request.auth.organizations;
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
