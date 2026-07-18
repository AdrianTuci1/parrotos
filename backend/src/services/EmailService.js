import { config } from '../config/index.js';

export class EmailService {
  constructor() {
    this.apiKey = config.resendApiKey;
    this.from = config.emailFrom;
    this.enabled = Boolean(this.apiKey);
  }

  async send({ to, subject, text, html }) {
    if (!this.enabled) {
      if (config.nodeEnv !== 'test') {
        console.log(`[EMAIL FALLBACK] To: ${to}\nSubject: ${subject}\n${text}`);
      }
      return { sent: false, fallback: true };
    }

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        from: this.from,
        to,
        subject,
        text,
        html,
      }),
    });

    const data = await response.json().catch(() => ({ error: 'Resend request failed' }));
    if (!response.ok) {
      throw new Error(data?.message || JSON.stringify(data));
    }

    return { sent: true, id: data.id };
  }
}

export const emailService = new EmailService();
