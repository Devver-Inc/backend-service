import { LogtoUser } from './responses/responses.type';
export type OrganizationMemberAndCount = {
  members: LogtoUser[];
  totalItemsCount: number;
};
