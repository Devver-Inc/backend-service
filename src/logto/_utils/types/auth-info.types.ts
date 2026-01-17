import { UserRoleEnum } from '../enums/permissions.enum';
import {
  LogtoUserClaimOrganization,
  LogtoUserClaimOrganizationRole,
} from '../schemas/logto-payload.types';
import { LogtoOrganization, LogtoUser } from './responses/responses.type';

export interface AuthRole {
  id: string;
  name: UserRoleEnum;
}

export class AuthInfo {
  public readonly sub: string;
  public readonly user: LogtoUser;
  public readonly clientId?: string;
  public readonly scopes: string[];
  public readonly audience: string[];
  public readonly organizations: readonly LogtoUserClaimOrganization[];
  public readonly selectedOrganization: LogtoOrganization | null;
  public readonly selectedOrganizationRoles: readonly LogtoUserClaimOrganizationRole[];
}
