import { Injectable, Logger } from "@nestjs/common";
import { UsersService } from "src/users/users.service";
import {
  LogtoWebhookEvent,
  LogtoWebhookPayload,
} from "./_utils/types/logto-webhook.types";

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);

  constructor(private readonly usersService: UsersService) {}

  async handleLogtoWebhookEvent(payload: LogtoWebhookPayload): Promise<void> {
    this.logger.log(`Received logto webhook event: ${payload.event}`);

    if (!payload || !payload.event || !payload.user) {
      this.logger.warn("Invalid webhook payload received");
      return;
    }

    try {
      switch (payload.event) {
        case LogtoWebhookEvent.POST_REGISTER:
          await this.usersService.createAccount(payload.user);
          break;

        case LogtoWebhookEvent.USER_CREATED:
          break;

        case LogtoWebhookEvent.USER_UPDATED:
          break;

        case LogtoWebhookEvent.USER_DELETED:
          break;

        case LogtoWebhookEvent.ORGANIZATION_CREATED:
          break;

        case LogtoWebhookEvent.ORGANIZATION_UPDATED:
          break;

        case LogtoWebhookEvent.ORGANIZATION_DELETED:
          break;

        default:
          this.logger.warn(`Unhandled webhook event: ${payload.event}`);
      }
    } catch (error) {
      this.logger.error(
        `Error processing webhook event: ${payload.event}`,
        error,
      );
    }
  }
}
