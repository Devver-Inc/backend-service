import {
  BadRequestException,
  createParamDecorator,
  ExecutionContext,
} from '@nestjs/common';
import { UserRoleEnum } from '../enums/permissions.enum';
import { AuthInfo } from '../types/auth-info.types';
import { LogtoUser } from '../types/responses/responses.type';
import { LogtoUserWithOrganizations } from '../types/user-with-organization.type';

export const userWithOrganizations = (
  auth: AuthInfo | null | undefined,
): LogtoUserWithOrganizations | null => {
  if (!auth?.user) return null;
  const selectedOrganizationRoles = [...(auth.selectedOrganizationRoles ?? [])];
  return {
    ...auth.user,
    currentOrganization: auth.selectedOrganization || null,
    organizations: [...(auth.organizations || [])],
    selectedOrganizationRoles,
    isAdmin: selectedOrganizationRoles.some(
      (r) => r.roleName === UserRoleEnum.ADMIN,
    ),
  } as LogtoUserWithOrganizations;
};

export const ConnectedUser = createParamDecorator(
  (_, ctx: ExecutionContext): LogtoUser => {
    const user = ctx.switchToHttp().getRequest().auth.user;
    if (!user)
      throw new BadRequestException('user not found in context of request');
    return user;
  },
);

export const OptionalConnectedUserWithOrgs = createParamDecorator(
  (_, ctx: ExecutionContext): LogtoUserWithOrganizations | null =>
    userWithOrganizations(ctx.switchToHttp().getRequest().auth),
);

export const ConnectedUserWithOrgs = createParamDecorator(
  (_, ctx: ExecutionContext): LogtoUserWithOrganizations => {
    const user = userWithOrganizations(ctx.switchToHttp().getRequest().auth);
    if (!user)
      throw new BadRequestException('user not found in context of request');
    return user;
  },
);
