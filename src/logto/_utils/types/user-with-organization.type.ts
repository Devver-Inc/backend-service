import { LogtoUserClaimOrganization } from "../schemas/logto-payload.types";
import { LogtoOrganization, LogtoUser } from "./responses/responses.type";

export type LogtoUserWithOrganizations = LogtoUser & {
  organizations: LogtoUserClaimOrganization[];
  currentOrganization: LogtoOrganization | null;
};
