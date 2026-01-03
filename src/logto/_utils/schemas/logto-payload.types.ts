import { Schema } from 'effect';

const LogtoOrganizationRoleCustomClaim = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
});

const LogtoOrganizationCustomClaimSchema = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  description: Schema.String,
  roles: Schema.Array(LogtoOrganizationRoleCustomClaim),
});

const LogtoCustomClaimsSchema = Schema.Struct({
  organizations: Schema.Array(LogtoOrganizationCustomClaimSchema),
});

export const JWTPayloadSchema = Schema.Struct({
  /**
   * JWT Subject
   *
   * @see {@link https://www.rfc-editor.org/rfc/rfc7519#section-4.1.2 RFC7519#section-4.1.2}
   */
  sub: Schema.String.pipe(Schema.nonEmptyString()),

  /**
   * JWT Issuer
   *
   * @see {@link https://www.rfc-editor.org/rfc/rfc7519#section-4.1.1 RFC7519#section-4.1.1}
   */
  iss: Schema.optional(Schema.String),
  /**
   * JWT Audience
   *
   * @see {@link https://www.rfc-editor.org/rfc/rfc7519#section-4.1.3 RFC7519#section-4.1.3}
   */
  aud: Schema.optional(
    Schema.Union(Schema.String, Schema.Array(Schema.String)),
  ),
  /**
   * JWT ID
   *
   * @see {@link https://www.rfc-editor.org/rfc/rfc7519#section-4.1.7 RFC7519#section-4.1.7}
   */
  jti: Schema.optional(Schema.String),
  /**
   * JWT Not Before
   *
   * @see {@link https://www.rfc-editor.org/rfc/rfc7519#section-4.1.5 RFC7519#section-4.1.5}
   */
  nbf: Schema.optional(Schema.Number),
  /**
   * JWT Expiration Time
   *
   * @see {@link https://www.rfc-editor.org/rfc/rfc7519#section-4.1.4 RFC7519#section-4.1.4}
   */
  exp: Schema.optional(Schema.Number),
  /**
   * JWT Issued At
   *
   * @see {@link https://www.rfc-editor.org/rfc/rfc7519#section-4.1.6 RFC7519#section-4.1.6}
   */
  iat: Schema.optional(Schema.Number),
});

const LogtoBasePayloadSchema = Schema.Struct({
  /**
   * The scopes of the token
   *
   * @see {@link https://docs.logto.io/developers/custom-token-claims/create-script}
   */
  scope: Schema.optional(Schema.String),
  /**
   * The client id of the token
   *
   * @see {@link https://docs.logto.io/developers/custom-token-claims/create-script}
   */
  client_id: Schema.optional(Schema.String),
  /**
   * The user id of the token
   *
   * @see {@link https://docs.logto.io/developers/custom-token-claims/create-script}
   */
  accountId: Schema.optional(Schema.String),
  /**
   * Whether the token will expire with the session
   *
   * @see {@link https://docs.logto.io/developers/custom-token-claims/create-script}
   */
  expiresWithSession: Schema.optional(Schema.String),
  /**
   * The current authentication grant id of the token
   *
   * @see {@link https://docs.logto.io/developers/custom-token-claims/create-script}
   */
  grantId: Schema.optional(Schema.String),
  /**
   * The grant type of the token
   *
   * @see {@link https://docs.logto.io/developers/custom-token-claims/create-script}
   */
  gty: Schema.optional(Schema.String),
  /**
   * The token kind (AccessToken)
   *
   * @see {@link https://docs.logto.io/developers/custom-token-claims/create-script}
   */
  kind: Schema.optional(Schema.String),
  /**
   * Organization ID (must match request)
   *
   * @see {@link https://docs.logto.io/authorization/validate-access-tokens}
   */
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
