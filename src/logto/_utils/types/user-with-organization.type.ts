import {
  LogtoUserClaimOrganization,
  LogtoUserClaimOrganizationRole,
} from '../schemas/logto-payload.types';
import { LogtoUser, LogtoOrganization } from './responses/responses.type';

export type LogtoUserWithOrganizations = LogtoUser & {
  organizations: LogtoUserClaimOrganization[];
  currentOrganization: LogtoOrganization;
  selectedOrganizationRoles: readonly LogtoUserClaimOrganizationRole[];
  isAdmin: boolean;
};
