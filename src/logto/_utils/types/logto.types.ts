import { ClientCredentials } from 'node_modules/@logto/api/lib/client-credentials'
import { paths } from 'node_modules/@logto/api/lib/generated-types/management'
import { type Client } from 'openapi-fetch'

/**
 * The API client for the Management API.
 *
 * This client is configured to use the provided client credentials
 * and will automatically include the access token in requests.
 */
export type LogtoClient = Client<paths>

/**
 * The client credentials instance used for authentication.
 */
export type LogtoClientCredentials = ClientCredentials
