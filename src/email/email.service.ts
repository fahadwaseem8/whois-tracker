import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

export interface DomainExpiryEmailData {
  email: string;
  domainName: string;
  expiryDate: Date;
  daysUntilExpiry: number;
}

export interface ExpiryDateChangedEmailData {
  email: string;
  domainName: string;
  oldExpiryDate: Date;
  newExpiryDate: Date;
}

@Injectable()
export class EmailService {
  private resend: Resend;
  private fromEmail: string;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('RESEND_API_KEY');
    if (!apiKey) {
      console.warn(
        'RESEND_API_KEY not configured. Email notifications will not be sent.',
      );
    }
    this.resend = new Resend(apiKey);
    this.fromEmail =
      this.configService.get<string>('FROM_EMAIL') || 'noreply@yourdomain.com';
  }

  async sendDomainExpiringEmail(data: DomainExpiryEmailData): Promise<void> {
    const { email, domainName, expiryDate, daysUntilExpiry } = data;

    const subject = `Domain Expiration Alert: ${domainName}`;
    const urgencyLevel =
      daysUntilExpiry <= 1
        ? 'CRITICAL'
        : daysUntilExpiry <= 7
          ? 'HIGH'
          : 'MEDIUM';

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { 
              font-family: Arial, sans-serif;
              line-height: 1.6; 
              color: #333333;
              margin: 0;
              padding: 20px;
              background-color: #ffffff;
            }
            .container { 
              max-width: 600px;
            }
            h2 {
              color: #000000;
              font-size: 20px;
              margin: 0 0 20px 0;
            }
            p {
              margin: 0 0 15px 0;
            }
            .info-section {
              margin: 20px 0;
              padding: 15px 0;
              border-top: 1px solid #cccccc;
              border-bottom: 1px solid #cccccc;
            }
            .info-section p {
              margin: 8px 0;
            }
            .footer {
              margin-top: 30px;
              padding-top: 20px;
              border-top: 1px solid #cccccc;
              font-size: 12px;
              color: #666666;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h2>Domain Expiration Alert</h2>
            
            <p>Hello,</p>
            
            <p>This is an automated notification regarding your tracked domain.</p>
            
            <div class="info-section">
              <p><strong>Domain:</strong> ${domainName}</p>
              <p><strong>Expiry Date:</strong> ${expiryDate.toLocaleDateString(
                'en-US',
                {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                },
              )}</p>
              <p><strong>Days Remaining:</strong> ${daysUntilExpiry} day${daysUntilExpiry !== 1 ? 's' : ''}</p>
              <p><strong>Priority:</strong> ${urgencyLevel}</p>
            </div>
            
            <p><strong>Action Required:</strong></p>
            <p>Please renew your domain registration before the expiry date to prevent service disruption.</p>
            
            <div class="footer">
              <p>WHOIS Tracker - Automated Domain Monitoring</p>
              <p>You are receiving this because ${domainName} is in your monitored domains list.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    try {
      await this.resend.emails.send({
        from: this.fromEmail,
        to: email,
        subject,
        html,
      });
      console.log(
        `Expiry alert email sent to ${email} for domain ${domainName}`,
      );
    } catch (error) {
      console.error(`Failed to send expiry email for ${domainName}:`, error);
      throw error;
    }
  }

  async sendExpiryDateChangedEmail(
    data: ExpiryDateChangedEmailData,
  ): Promise<void> {
    const { email, domainName, oldExpiryDate, newExpiryDate } = data;

    const subject = `Domain Expiry Date Updated: ${domainName}`;
    const isExtended = newExpiryDate > oldExpiryDate;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { 
              font-family: Arial, sans-serif;
              line-height: 1.6; 
              color: #333333;
              margin: 0;
              padding: 20px;
              background-color: #ffffff;
            }
            .container { 
              max-width: 600px;
            }
            h2 {
              color: #000000;
              font-size: 20px;
              margin: 0 0 20px 0;
            }
            p {
              margin: 0 0 15px 0;
            }
            .date-section {
              margin: 20px 0;
              padding: 15px 0;
              border-top: 1px solid #cccccc;
              border-bottom: 1px solid #cccccc;
            }
            .date-section p {
              margin: 8px 0;
            }
            .footer {
              margin-top: 30px;
              padding-top: 20px;
              border-top: 1px solid #cccccc;
              font-size: 12px;
              color: #666666;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h2>Domain Expiry Date Updated</h2>
            
            <p>Hello,</p>
            
            <p>Our monitoring system has detected a change in the expiration date for your tracked domain.</p>
            
            <div class="date-section">
              <p><strong>Domain:</strong> ${domainName}</p>
              <p><strong>Previous Expiry Date:</strong> ${oldExpiryDate.toLocaleDateString(
                'en-US',
                {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                },
              )}</p>
              <p><strong>New Expiry Date:</strong> ${newExpiryDate.toLocaleDateString(
                'en-US',
                {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                },
              )}</p>
              <p><strong>Status:</strong> ${isExtended ? 'Extended' : 'Shortened'}</p>
            </div>
            
            <p>${
              isExtended
                ? 'The domain expiration date has been extended.'
                : 'The domain expiration date has been moved to an earlier date.'
            }</p>
            
            <div class="footer">
              <p>WHOIS Tracker - Automated Domain Monitoring</p>
              <p>Change detected during routine WHOIS data synchronization.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    try {
      await this.resend.emails.send({
        from: this.fromEmail,
        to: email,
        subject,
        html,
      });
      console.log(
        `Expiry date change email sent to ${email} for domain ${domainName}`,
      );
    } catch (error) {
      console.error(
        `Failed to send expiry change email for ${domainName}:`,
        error,
      );
      throw error;
    }
  }
}
