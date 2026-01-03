import { Body, Controller, Post, UseGuards } from "@nestjs/common";
import { LogtoWebhookSignatureGuard } from "./_utils/guards/logto-webhook-signature.guard";
import { LogtoWebhookPayload } from "./_utils/types/logto-webhook.types";
import { WebhooksService } from "./webhooks.service";

@Controller("webhooks")
export class WebhooksController {
  constructor(private readonly webhooksService: WebhooksService) {}

  @Post("logto")
  @UseGuards(LogtoWebhookSignatureGuard)
  async handleLogtoWebhook(@Body() payload: LogtoWebhookPayload) {
    return this.webhooksService.handleLogtoWebhookEvent(payload);
  }
}
