import { LogtoUserClaimOrganization } from '../schemas/logto-payload.types';
import { LogtoUser, LogtoOrganization } from './responses/responses.type';

export type LogtoUserWithoutOrganization = LogtoUser & {
  organizations: LogtoUserClaimOrganization[];
  currentOrganization: null;
};

export type LogtoUserWithOrganizations = LogtoUser & {
  organizations: LogtoUserClaimOrganization[];
  currentOrganization: LogtoOrganization;
};
