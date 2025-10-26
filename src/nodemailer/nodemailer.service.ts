import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MailerService } from '@nestjs-modules/mailer';
import { EnvironmentVariables } from '../_utils/config/env.config';

@Injectable()
export class NodemailerService implements OnModuleInit {
  private readonly logger = new Logger(NodemailerService.name);

  constructor(
    private readonly configService: ConfigService<EnvironmentVariables, true>,
    private readonly mailerService: MailerService,
  ) {}

  onModuleInit() {
    const smtpHost = this.configService.get('SMTP_HOST');
    const smtpFrom = this.configService.get('SMTP_FROM');
    const smtpPort = this.configService.get('SMTP_PORT');
    const smtpUser = this.configService.get('SMTP_USER');
    const smtpPassword = this.configService.get('SMTP_PASSWORD');
    const smtpPreview = this.configService.get('SMTP_PREVIEW');

    if (!smtpHost || !smtpFrom || !smtpPort || !smtpUser || !smtpPassword)
      this.logger.error('SMTP configuration is missing');

    if (smtpPreview) this.logger.debug('SMTP preview mode is enabled');
  }

  sendForgotPasswordEmail = (email: string, name: string, resetPasswordToken: string, tokenExpire?: Date | null) =>
    this.mailerService.sendMail({
      to: email,
      subject: `Vos informations de connexion`,
      template: 'forgot-password.template.ejs',
      context: {
        name: name,
        forgotPasswordUrl: `${this.configService.get(
          'FRONT_URL',
        )}/recover-password?code=${resetPasswordToken}&time=${tokenExpire ?? new Date()}`,
      },
    });
}
