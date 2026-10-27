import type { paths } from 'node_modules/@logto/api/lib/generated-types/management';
import { LogtoRequests } from 'src/logto/logto.requests';
import { ValidatedOrganization } from '../../schemas/logto-organization.schema';

export type LogtoResponseType<T> = {
  data?: T;
  error?: unknown;
  response?: Response;
};

export type LogtoUser = NonNullable<
  Awaited<ReturnType<LogtoRequests['fetchUserInformations']>>
>;
export type LogtoOrganizationMember = LogtoUser & {
  organizationRoles: { id: string; name: string }[];
};
export type LogtoOrganization = ValidatedOrganization;
export type LogtoOrganizations = ValidatedOrganization[];
export type LogtoOrganizationJitEmailDomain = NonNullable<
  Awaited<ReturnType<LogtoRequests['addOrganizationJitEmailDomain']>>
>;

export type LogtoRoles = NonNullable<
  Awaited<ReturnType<LogtoRequests['getOrganizationsRoles']>>
>;
export type LogtoUserRoles = NonNullable<
  Awaited<ReturnType<LogtoRequests['getUserRoles']>>
>;
export type LogtoOrganizationRaw =
  paths['/api/organizations']['post']['responses'][201]['content']['application/json'];
