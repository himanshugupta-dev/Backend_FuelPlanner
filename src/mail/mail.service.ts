import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { TemplateRenderer } from './template.renderer';

export interface SendMailOptions {
  to: string;
  subject: string;
  template: string;
  context: Record<string, string | number>;
  text?: string;
}

@Injectable()
export class MailService implements OnModuleInit {
  private readonly logger = new Logger(MailService.name);
  private readonly transporter: nodemailer.Transporter | null;
  private readonly renderer = new TemplateRenderer();
  private readonly fromAddress: string;
  private readonly appName: string;
  private readonly isProd: boolean;
  private readonly hasCredentials: boolean;
  private transporterReady = false;

  constructor(private readonly config: ConfigService) {
    this.appName = this.config.get<string>('APP_NAME', 'FuelPlanner');
    this.isProd =
      this.config.get<string>('NODE_ENV', 'development') === 'production';

    const user = this.config.get<string>('SMTP_USER');
    const pass = this.config.get<string>('SMTP_PASS');
    this.hasCredentials = Boolean(user && pass);

    this.fromAddress =
      this.config.get<string>('MAIL_FROM') ||
      `${this.appName} <${user || 'no-reply@fuelplanner.com'}>`;

    if (!this.hasCredentials) {
      this.transporter = null;
      return;
    }

    this.transporter = nodemailer.createTransport({
      host: this.config.get<string>('SMTP_HOST', 'smtp.gmail.com'),
      port: Number(this.config.get<string>('SMTP_PORT', '587')),
      secure:
        this.config.get<string>('SMTP_SECURE', 'false').toLowerCase() ===
        'true',
      auth: { user, pass },
    });
  }

  async onModuleInit(): Promise<void> {
    if (!this.transporter) {
      this.logger.warn(
        'SMTP_USER / SMTP_PASS are not set. Email sending is DISABLED. ' +
          'In development, emails will be logged to the console instead. ' +
          'Set SMTP_USER, SMTP_PASS (and SMTP_HOST/SMTP_PORT) in your .env to enable real email delivery.',
      );
      return;
    }

    try {
      await this.transporter.verify();
      this.transporterReady = true;
      this.logger.log(`SMTP transport ready (from: ${this.fromAddress})`);
    } catch (err) {
      this.transporterReady = false;
      this.logger.error(
        'SMTP credentials invalid or server unreachable. Emails will NOT be sent. ' +
          'If using Gmail, make sure you use an App Password (https://myaccount.google.com/apppasswords), not your normal password.',
        err as Error,
      );
    }
  }

  /**
   * Generic send using a named template.
   * Context is auto-enriched with `appName`, `year`, `subject`.
   */
  async send(options: SendMailOptions): Promise<void> {
    const context = {
      appName: this.appName,
      year: new Date().getFullYear(),
      subject: options.subject,
      ...options.context,
    };

    const html = this.renderer.render(options.template, context);

    // No transporter or not ready -> degrade gracefully in non-prod, throw in prod
    if (!this.transporter || !this.transporterReady) {
      const msg =
        'Email transport is not configured or SMTP credentials are invalid.';
      if (this.isProd) {
        this.logger.error(msg);
        throw new Error(msg);
      }

      this.logger.warn(
        `[DEV] Skipping real email send for [${options.template}] to ${options.to}. ` +
          `Subject: "${options.subject}". Context: ${JSON.stringify(options.context)}`,
      );
      return;
    }

    try {
      await this.transporter.sendMail({
        from: this.fromAddress,
        to: options.to,
        subject: options.subject,
        text: options.text,
        html,
      });
      this.logger.log(`Mail [${options.template}] sent to ${options.to}`);
    } catch (err) {
      this.logger.error(
        `Failed to send [${options.template}] to ${options.to}`,
        err as Error,
      );
      if (this.isProd) throw err;
      // In dev, don't block the user flow on email errors.
      this.logger.warn(
        `[DEV] Swallowing email error so the request can complete. Fix SMTP settings to send real emails.`,
      );
    }
  }

  async sendOtpEmail(
    to: string,
    name: string,
    otp: string,
    expiryMinutes = 10,
  ): Promise<void> {
    // Always log OTP in non-prod so developers can test without SMTP.
    if (!this.isProd) {
      this.logger.log(`[DEV] OTP for ${to}: ${otp} (expires in ${expiryMinutes}m)`);
    }

    await this.send({
      to,
      subject: `${this.appName} - Your Verification Code`,
      template: 'otp',
      context: { name, otp, expiryMinutes },
      text: `Hello ${name},\n\nYour ${this.appName} verification code is: ${otp}\n\nThis code will expire in ${expiryMinutes} minutes. If you did not request this code, please ignore this email.\n\n— The ${this.appName} Team`,
    });
  }

  async sendWelcomeEmail(
    to: string,
    name: string,
    ctaUrl = '#',
    ctaLabel = 'Get Started',
  ): Promise<void> {
    await this.send({
      to,
      subject: `Welcome to ${this.appName}!`,
      template: 'welcome',
      context: { name, ctaUrl, ctaLabel },
      text: `Hi ${name},\n\nWelcome to ${this.appName}! Your account is now active. Visit ${ctaUrl} to get started.\n\n— The ${this.appName} Team`,
    });
  }
}
