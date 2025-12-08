import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";

interface EmailConfig {
  provider: "smtp" | "sendgrid" | "console";
  smtp?: {
    host: string;
    port: number;
    secure: boolean;
    auth: {
      user: string;
      pass: string;
    };
  };
  sendgrid?: {
    apiKey: string;
  };
  from: string;
}

interface EmailOptions {
  to: string;
  subject: string;
  text: string;
  html: string;
}

class EmailService {
  private config: EmailConfig;
  private transporter: Transporter | null = null;

  constructor() {
    this.config = this.loadConfig();
    this.initializeTransporter();
  }

  private loadConfig(): EmailConfig {
    const provider = (process.env.EMAIL_PROVIDER || "console") as EmailConfig["provider"];
    const from = process.env.EMAIL_FROM || "Bootah <noreply@bootah.local>";

    const config: EmailConfig = {
      provider,
      from,
    };

    if (provider === "smtp") {
      config.smtp = {
        host: process.env.SMTP_HOST || "localhost",
        port: parseInt(process.env.SMTP_PORT || "587", 10),
        secure: process.env.SMTP_SECURE === "true",
        auth: {
          user: process.env.SMTP_USER || "",
          pass: process.env.SMTP_PASS || "",
        },
      };
    } else if (provider === "sendgrid") {
      config.sendgrid = {
        apiKey: process.env.SENDGRID_API_KEY || "",
      };
    }

    return config;
  }

  private initializeTransporter(): void {
    if (this.config.provider === "smtp" && this.config.smtp) {
      this.transporter = nodemailer.createTransport({
        host: this.config.smtp.host,
        port: this.config.smtp.port,
        secure: this.config.smtp.secure,
        auth: this.config.smtp.auth.user ? this.config.smtp.auth : undefined,
      });
      console.log(`[Email] SMTP transporter initialized: ${this.config.smtp.host}:${this.config.smtp.port}`);
    } else if (this.config.provider === "sendgrid" && this.config.sendgrid) {
      this.transporter = nodemailer.createTransport({
        host: "smtp.sendgrid.net",
        port: 587,
        secure: false,
        auth: {
          user: "apikey",
          pass: this.config.sendgrid.apiKey,
        },
      });
      console.log("[Email] SendGrid transporter initialized");
    } else {
      console.log("[Email] Console mode - emails will be logged to console");
    }
  }

  async sendEmail(options: EmailOptions): Promise<boolean> {
    try {
      if (this.config.provider === "console" || !this.transporter) {
        console.log("\n" + "=".repeat(60));
        console.log("[Email] SIMULATED EMAIL (console mode)");
        console.log("=".repeat(60));
        console.log(`To: ${options.to}`);
        console.log(`Subject: ${options.subject}`);
        console.log("-".repeat(60));
        console.log(options.text);
        console.log("=".repeat(60) + "\n");
        return true;
      }

      await this.transporter.sendMail({
        from: this.config.from,
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html,
      });

      console.log(`[Email] Sent successfully to: ${options.to}`);
      return true;
    } catch (error) {
      console.error("[Email] Failed to send email:", error);
      return false;
    }
  }

  async sendPasswordResetEmail(
    email: string,
    resetToken: string,
    oneTimeCode: string,
    appUrl: string
  ): Promise<boolean> {
    const resetUrl = `${appUrl}/reset-password?token=${resetToken}`;
    
    const subject = "Bootah - Password Reset Request";
    
    const text = `
Password Reset Request
======================

You have requested to reset your password for your Bootah account.

Option 1: Click the link below to reset your password:
${resetUrl}

Option 2: Use this one-time code on the reset page:
${oneTimeCode}

This link and code will expire in 1 hour.

If you did not request this password reset, please ignore this email.
Your password will remain unchanged.

- The Bootah Team
    `.trim();

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Password Reset</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 28px;">Bootah</h1>
    <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">Password Reset Request</p>
  </div>
  
  <div style="background: #f9f9f9; padding: 30px; border: 1px solid #e0e0e0; border-top: none;">
    <p>You have requested to reset your password for your Bootah account.</p>
    
    <div style="background: white; border: 1px solid #e0e0e0; border-radius: 8px; padding: 20px; margin: 20px 0;">
      <h3 style="margin-top: 0; color: #667eea;">Option 1: Click the button</h3>
      <p style="text-align: center;">
        <a href="${resetUrl}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; padding: 12px 30px; border-radius: 5px; font-weight: bold;">Reset Password</a>
      </p>
    </div>
    
    <div style="background: white; border: 1px solid #e0e0e0; border-radius: 8px; padding: 20px; margin: 20px 0;">
      <h3 style="margin-top: 0; color: #667eea;">Option 2: Use this code</h3>
      <p style="text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #333; font-family: monospace; background: #f0f0f0; padding: 15px; border-radius: 5px;">${oneTimeCode}</p>
    </div>
    
    <p style="color: #666; font-size: 14px;"><strong>Note:</strong> This link and code will expire in 1 hour.</p>
    
    <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 20px 0;">
    
    <p style="color: #999; font-size: 12px;">If you did not request this password reset, please ignore this email. Your password will remain unchanged.</p>
  </div>
  
  <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
    <p>&copy; ${new Date().getFullYear()} Bootah - PXE Boot and OS Imaging Platform</p>
  </div>
</body>
</html>
    `.trim();

    return this.sendEmail({
      to: email,
      subject,
      text,
      html,
    });
  }

  async sendWelcomeEmail(email: string, username: string, appUrl: string): Promise<boolean> {
    const subject = "Welcome to Bootah";
    
    const text = `
Welcome to Bootah!
==================

Hi ${username},

Your account has been created successfully.

You can log in at: ${appUrl}/login

- The Bootah Team
    `.trim();

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to Bootah</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 28px;">Bootah</h1>
    <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">Welcome!</p>
  </div>
  
  <div style="background: #f9f9f9; padding: 30px; border: 1px solid #e0e0e0; border-top: none;">
    <p>Hi <strong>${username}</strong>,</p>
    <p>Your account has been created successfully. You can now log in and start managing your PXE boot environment.</p>
    
    <p style="text-align: center; margin: 30px 0;">
      <a href="${appUrl}/login" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; padding: 12px 30px; border-radius: 5px; font-weight: bold;">Log In Now</a>
    </p>
  </div>
  
  <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
    <p>&copy; ${new Date().getFullYear()} Bootah - PXE Boot and OS Imaging Platform</p>
  </div>
</body>
</html>
    `.trim();

    return this.sendEmail({
      to: email,
      subject,
      text,
      html,
    });
  }

  async verifyConnection(): Promise<boolean> {
    if (this.config.provider === "console" || !this.transporter) {
      console.log("[Email] Console mode - no connection to verify");
      return true;
    }

    try {
      await this.transporter.verify();
      console.log("[Email] Connection verified successfully");
      return true;
    } catch (error) {
      console.error("[Email] Connection verification failed:", error);
      return false;
    }
  }

  getProviderInfo(): { provider: string; configured: boolean } {
    return {
      provider: this.config.provider,
      configured: this.config.provider === "console" || 
        (this.config.provider === "smtp" && !!this.config.smtp?.host) ||
        (this.config.provider === "sendgrid" && !!this.config.sendgrid?.apiKey),
    };
  }
}

export const emailService = new EmailService();
export default emailService;
