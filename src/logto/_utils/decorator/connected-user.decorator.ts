import {
  BadRequestException,
  createParamDecorator,
  ExecutionContext,
} from '@nestjs/common';
import {
  LogtoOrganization,
  LogtoUser,
} from '../types/responses/responses.type';
import { LogtoUserWithOrganizations } from '../types/user-with-organization.type';

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

    return {
      ...user,
      currentOrganization: currentOrganization || null,
      organizations: organizations || [],
    };
  },
);
