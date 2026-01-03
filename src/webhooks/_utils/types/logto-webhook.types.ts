import { LogtoUser } from "src/logto/_utils/types/responses/responses.type";

export enum LogtoWebhookEvent {
  POST_REGISTER = "PostRegister",
  POST_SIGN_IN = "PostSignIn",
  POST_RESET_PASSWORD = "PostResetPassword",
  USER_CREATED = "User.Created",
  USER_UPDATED = "User.Data.Updated",
  USER_DELETED = "User.Deleted",
  ORGANIZATION_CREATED = "Organization.Created",
  ORGANIZATION_UPDATED = "Organization.Data.Updated",
  ORGANIZATION_DELETED = "Organization.Deleted",
}

export interface LogtoWebhookPayload {
  /**
   * Webhook event type
   */
  event: LogtoWebhookEvent | string;

  /**
   * Timestamp when the event was created
   */
  createdAt: string;

  /**
   * Session ID associated with the interaction (if applicable)
   */
  sessionId?: string;

  /**
   * The interaction event type (for PostRegister, PostSignIn, etc.)
   */
  interactionEvent?: string;

  /**
   * User agent of the client
   */
  userAgent?: string;

  /**
   * IP address of the client
   */
  ip?: string;

  /**
   * User ID who triggered the event
   */
  userId?: string;

  /**
   * Full user object (available in some events)
   */
  user?: LogtoUser;

  /**
   * Application ID associated with the event
   */
  applicationId?: string;

  /**
   * Additional data specific to the event type
   */
  data?: Record<string, unknown>;
}
