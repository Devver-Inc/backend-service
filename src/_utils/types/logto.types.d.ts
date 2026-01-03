import { ClientCredentials } from "node_modules/@logto/api/lib/client-credentials";
import { paths } from "node_modules/@logto/api/lib/generated-types/management";
import { type Client } from "openapi-fetch";
export type LogtoClient = Client<paths>;
export type LogtoClientCredentials = ClientCredentials;
