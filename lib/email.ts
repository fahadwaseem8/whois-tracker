import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
});

interface WhoisChangeEmailData {
  to: string;
  domain: string;
  oldData: Record<string, unknown>;
  newData: Record<string, unknown>;
  changes: string[];
}

export async function sendWhoisChangeEmail(data: WhoisChangeEmailData) {
  const { to, domain, oldData, newData, changes } = data;

  const changesHtml = changes
    .map((change) => `<li style="margin-bottom: 8px;">${change}</li>`)
    .join('');

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>WHOIS Change Alert</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 28px;">🔔 WHOIS Change Detected</h1>
      </div>
      
      <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
        <p style="font-size: 16px; margin-bottom: 20px;">
          We detected changes in the WHOIS record for <strong style="color: #667eea;">${domain}</strong>
        </p>

        <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #667eea;">
          <h2 style="color: #667eea; font-size: 20px; margin-top: 0;">Changes Detected:</h2>
          <ul style="list-style-type: none; padding-left: 0;">
            ${changesHtml}
          </ul>
        </div>

        <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <h3 style="color: #333; font-size: 18px; margin-top: 0;">📄 Complete New WHOIS Record:</h3>
          <pre style="background: #f1f3f4; padding: 15px; border-radius: 5px; overflow-x: auto; font-size: 12px;">${JSON.stringify(newData, null, 2)}</pre>
        </div>

        <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <h3 style="color: #333; font-size: 18px; margin-top: 0;">📋 Previous WHOIS Record:</h3>
          <pre style="background: #f1f3f4; padding: 15px; border-radius: 5px; overflow-x: auto; font-size: 12px;">${JSON.stringify(oldData, null, 2)}</pre>
        </div>

        <div style="text-align: center; margin-top: 30px;">
          <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard" 
             style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">
            View Dashboard
          </a>
        </div>

        <p style="margin-top: 30px; font-size: 12px; color: #666; text-align: center;">
          You're receiving this email because you're tracking ${domain} on WHOIS Tracker.
        </p>
      </div>
    </body>
    </html>
  `;

  const textContent = `
WHOIS Change Alert for ${domain}

Changes Detected:
${changes.map((change) => `- ${change}`).join('\n')}

Complete New WHOIS Record:
${JSON.stringify(newData, null, 2)}

Previous WHOIS Record:
${JSON.stringify(oldData, null, 2)}

View your dashboard: ${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard
  `;

  await transporter.sendMail({
    from: `"WHOIS Tracker" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
    to,
    subject: `🔔 WHOIS Change Detected for ${domain}`,
    text: textContent,
    html: htmlContent,
  });
}
