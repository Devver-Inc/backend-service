import { UserRoleEnum } from "../enums/permissions.enum";
import {
  LogtoUserClaimOrganization,
  LogtoUserClaimOrganizationRole,
} from "../schemas/logto-payload.types";
import { LogtoOrganization, LogtoUser } from "./responses/responses.type";
export interface AuthRole {
  id: string;
  name: UserRoleEnum;
}
export declare class AuthInfo {
  readonly sub: string;
  readonly user: LogtoUser;
  readonly clientId?: string;
  readonly scopes: string[];
  readonly audience: string[];
  readonly organizations: readonly LogtoUserClaimOrganization[];
  readonly selectedOrganization: LogtoOrganization | null;
  readonly selectedOrganizationRoles: readonly LogtoUserClaimOrganizationRole[];
}
