import { Schema } from 'effect';

const LogtoOrganizationRoleCustomClaim = Schema.Struct({
  roleId: Schema.String,
  roleName: Schema.String,
});

const LogtoOrganizationCustomClaimSchema = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  description: Schema.NullOr(Schema.String),
  roles: Schema.Array(LogtoOrganizationRoleCustomClaim),
});

const LogtoCustomClaimsSchema = Schema.Struct({
  organizations: Schema.Array(LogtoOrganizationCustomClaimSchema),
});

export const JWTPayloadSchema = Schema.Struct({
  sub: Schema.String.pipe(Schema.nonEmptyString()),

  iss: Schema.optional(Schema.String),
  aud: Schema.optional(
    Schema.Union(Schema.String, Schema.Array(Schema.String)),
  ),
  jti: Schema.optional(Schema.String),
  nbf: Schema.optional(Schema.Number),
  exp: Schema.optional(Schema.Number),
  iat: Schema.optional(Schema.Number),
});

const LogtoBasePayloadSchema = Schema.Struct({
  scope: Schema.optional(Schema.String),
  client_id: Schema.optional(Schema.String),
  accountId: Schema.optional(Schema.String),
  expiresWithSession: Schema.optional(Schema.String),
  grantId: Schema.optional(Schema.String),
  gty: Schema.optional(Schema.String),
  kind: Schema.optional(Schema.String),
  organization_id: Schema.optional(Schema.String),
});

const LogtoPayloadSchema = JWTPayloadSchema.pipe(
  Schema.extend(LogtoCustomClaimsSchema),
  Schema.extend(LogtoBasePayloadSchema),
);

export type LogtoPayload = Schema.Schema.Type<typeof LogtoPayloadSchema>;
export type LogtoUserClaimOrganization = Schema.Schema.Type<
  typeof LogtoOrganizationCustomClaimSchema
>;
export type LogtoUserClaimOrganizationRole = Schema.Schema.Type<
  typeof LogtoOrganizationRoleCustomClaim
>;
export const decodeLogtoPayload = Schema.decodeUnknownSync(LogtoPayloadSchema);
