import { LogtoUser } from 'src/logto/_utils/types/responses/responses.type';

export enum LogtoWebhookEvent {
  POST_REGISTER = 'PostRegister',
  POST_SIGN_IN = 'PostSignIn',
  POST_RESET_PASSWORD = 'PostResetPassword',
  USER_CREATED = 'User.Created',
  USER_UPDATED = 'User.Data.Updated',
  USER_DELETED = 'User.Deleted',
  ORGANIZATION_CREATED = 'Organization.Created',
  ORGANIZATION_UPDATED = 'Organization.Data.Updated',
  ORGANIZATION_DELETED = 'Organization.Deleted',
}

export interface LogtoWebhookPayload {
  event: LogtoWebhookEvent | string;

  createdAt: string;

  sessionId?: string;

  interactionEvent?: string;

  userAgent?: string;

  ip?: string;

  userId?: string;

  user?: LogtoUser;

  applicationId?: string;

  data?: Record<string, unknown>;
}
