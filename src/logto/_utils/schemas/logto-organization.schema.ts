import { Schema as S } from 'effect';
import { LogtoOrganizationRaw } from '../types/responses/responses.type';

export const OrganizationCustomDataSchema = S.Struct({
  ownerId: S.optionalWith(S.String, { default: () => '' }),
  adminIds: S.optionalWith(S.Array(S.String), { default: () => [] }),
});

export type OrganizationCustomData = S.Schema.Type<
  typeof OrganizationCustomDataSchema
>;

export type ValidatedOrganization = Omit<LogtoOrganizationRaw, 'customData'> & {
  customData: OrganizationCustomData;
};

const decodeCustomData = S.decodeUnknownSync(OrganizationCustomDataSchema, {
  onExcessProperty: 'ignore',
  errors: 'all',
});

export const toValidatedOrganization = (
  org: LogtoOrganizationRaw,
): ValidatedOrganization => ({
  ...org,
  customData: decodeCustomData(org.customData),
});

export const toValidatedOrganizations = (
  orgs: LogtoOrganizationRaw[],
): ValidatedOrganization[] => orgs.map(toValidatedOrganization);
