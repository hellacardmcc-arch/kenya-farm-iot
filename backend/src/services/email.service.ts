import nodemailer from 'nodemailer';
import * as dotenv from 'dotenv';

dotenv.config();

// Create transporter (using Gmail for demo - in production use SMTP)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER || 'your-email@gmail.com',
    pass: process.env.EMAIL_PASSWORD || 'your-app-password',
  },
});

// For development/testing without real email
const isTestMode = process.env.NODE_ENV === 'development';

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail(options: SendEmailOptions): Promise<boolean> {
  const { to, subject, html } = options;
  try {
    if (isTestMode) {
      // In development, log to console instead of sending
      console.log('📧 EMAIL SENT (TEST MODE):');
      console.log('To:', to);
      console.log('Subject:', subject);
      console.log('HTML:', html.substring(0, 200) + '...');
      return true;
    }

    const mailOptions = {
      from: `"Kenya Farm IoT" <${process.env.EMAIL_USER || 'noreply@kenyafarmiot.co.ke'}>`,
      to,
      subject,
      html,
    };

    await transporter.sendMail(mailOptions);
    console.log(`Email sent to ${to}`);
    return true;
  } catch (error) {
    console.error('Failed to send email:', error);
    return false;
  }
}

// Email templates
export const emailTemplates = {
  welcome: (username: string, verificationLink: string) => `
    <h2>Welcome to Kenya Farm IoT Admin Portal</h2>
    <p>Hello ${username},</p>
    <p>Your admin account has been created successfully.</p>
    <p>Please verify your email by clicking the link below:</p>
    <p><a href="${verificationLink}">Verify Email</a></p>
    <p>This link will expire in 24 hours.</p>
  `,

  passwordReset: (username: string, resetLink: string) => `
    <h2>Password Reset Request</h2>
    <p>Hello ${username},</p>
    <p>You requested to reset your password.</p>
    <p>Click the link below to reset your password:</p>
    <p><a href="${resetLink}">Reset Password</a></p>
    <p>This link will expire in 1 hour.</p>
    <p>If you didn't request this, please ignore this email.</p>
  `,
};
