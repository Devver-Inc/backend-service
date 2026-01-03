import type { paths } from 'node_modules/@logto/api/lib/generated-types/management';
import { LogtoRequests } from 'src/logto/logto.requests';
import { ValidatedOrganization } from '../../schemas/logto-organization.schema';
export type LogtoResponseType<T> = {
    data?: T;
    error?: unknown;
    response?: Response;
};
export type LogtoUser = NonNullable<Awaited<ReturnType<LogtoRequests['fetchUserInformations']>>>;
export type LogtoOrganization = ValidatedOrganization;
export type LogtoOrganizations = ValidatedOrganization[];
export type LogtoOrganizationJitEmailDomain = NonNullable<Awaited<ReturnType<LogtoRequests['addOrganizationJitEmailDomain']>>>;
export type LogtoOrganizationPermissions = NonNullable<Awaited<ReturnType<LogtoRequests['getCurrentUserPermissions']>>>;
export type LogtoRoles = NonNullable<Awaited<ReturnType<LogtoRequests['getOrganizationsRoles']>>>;
export type LogtoUserRoles = NonNullable<Awaited<ReturnType<LogtoRequests['getUserRoles']>>>;
export type LogtoUserPermissions = NonNullable<Awaited<ReturnType<LogtoRequests['getCurrentUserPermissions']>>>;
export type LogtoOrganizationRaw = paths['/api/organizations']['post']['responses'][201]['content']['application/json'];
