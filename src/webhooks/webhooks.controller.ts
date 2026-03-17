import { Body, Controller, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { LogtoWebhookSignatureGuard } from './_utils/guards/logto-webhook-signature.guard';
import { LogtoWebhookPayload } from './_utils/types/logto-webhook.types';
import { WebhooksService } from './webhooks.service';

@ApiTags('Webhooks')
@Controller('webhooks')
export class WebhooksController {
  constructor(private readonly webhooksService: WebhooksService) {}

  @Post('logto')
  @UseGuards(LogtoWebhookSignatureGuard)
  @ApiOperation({ summary: 'Handle Logto webhook events' })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Missing webhook signature | Invalid webhook signature',
  })
  async handleLogtoWebhook(@Body() payload: LogtoWebhookPayload) {
    return this.webhooksService.handleLogtoWebhookEvent(payload);
  }
}
