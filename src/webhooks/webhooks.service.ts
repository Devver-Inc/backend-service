import { Injectable, Logger } from '@nestjs/common';
import { UsersService } from 'src/users/users.service';
import {
  LogtoWebhookEvent,
  LogtoWebhookPayload,
} from './_utils/types/logto-webhook.types';

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);

  constructor(private readonly usersService: UsersService) {}

  async handleLogtoWebhookEvent(payload: LogtoWebhookPayload): Promise<void> {
    this.logger.log(`Received logto webhook event: ${payload.event}`);

    if (!payload || !payload.event || !payload.user) {
      this.logger.warn('Invalid webhook payload received');
      return;
    }

    try {
      if (payload.event === LogtoWebhookEvent.POST_REGISTER) {
        await this.usersService.createAccount(payload.user);
      }
    } catch (error) {
      this.logger.error(
        `Error processing webhook event: ${payload.event}`,
        error,
      );
    }
  }
}
