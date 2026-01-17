import { Injectable } from '@nestjs/common';
import { LogtoPayload } from './_utils/schemas/logto-payload.types';
import { AuthInfo } from './_utils/types/auth-info.types';
import {
  LogtoOrganization,
  LogtoUser,
} from './_utils/types/responses/responses.type';

@Injectable()
export class LogtoMapper {
  toAuthInfo = (
    payload: LogtoPayload,
    user: LogtoUser,
    selectedOrganization: LogtoOrganization | null,
  ): AuthInfo => ({
    sub: payload.sub,
    clientId: payload.client_id,
    user,
    organizations: payload.organizations,
    scopes: (payload.scope as string)?.split(' ') ?? [],
    audience: Array.isArray(payload.aud)
      ? payload.aud
      : payload.aud
        ? [payload.aud]
        : [],
    selectedOrganization: selectedOrganization,
    selectedOrganizationRoles:
      payload.organizations.find((org) => org.id === payload.organization_id)
        ?.roles ?? [],
  });
}
