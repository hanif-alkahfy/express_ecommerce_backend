const nodemailer = require('nodemailer');
const { MailtrapClient } = require('mailtrap');

const EMAIL_PROVIDER = process.env.EMAIL_PROVIDER || 'mailtrap';
const MAX_RETRIES = 3;

const createMailtrapClient = () => {
  return new MailtrapClient({
    token: process.env.MAILTRAP_API_KEY,
    sandbox: process.env.MAILTRAP_SANDBOX === 'true',
    testInboxId: process.env.MAILTRAP_INBOX_ID ? parseInt(process.env.MAILTRAP_INBOX_ID) : undefined
  });
};

const createSmtpTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD
    }
  });
};

const sendWithMailtrap = async (to, subject, html) => {
  const client = createMailtrapClient();
  
  const info = await client.send({
    from: { 
      email: process.env.EMAIL_FROM || 'hello@demomailtrap.co', 
      name: 'E-Commerce' 
    },
    to: [{ email: to }],
    subject: subject,
    html: html
  });

  return info;
};

const sendWithSmtp = async (to, subject, html) => {
  const transporter = createSmtpTransporter();
  
  const info = await transporter.sendMail({
    from: process.env.EMAIL_FROM || 'noreply@yourdomain.com',
    to: to,
    subject: subject,
    html: html
  });

  return info;
};

const sendEmail = async (to, subject, html) => {
  let lastError;
  
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      if (EMAIL_PROVIDER === 'smtp') {
        return await sendWithSmtp(to, subject, html);
      }
      return await sendWithMailtrap(to, subject, html);
    } catch (error) {
      lastError = error;
      console.error(`Email send attempt ${attempt}/${MAX_RETRIES} failed:`, error.message);
      
      if (attempt < MAX_RETRIES) {
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    }
  }
  
  console.error('Email send failed after all retries:', lastError);
  throw lastError;
};

const sendVerificationEmail = async (user, verificationToken) => {
  const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken.token}`;
  
  const subject = 'Email Verification';
  const html = `
    <h1>Verify Your Email</h1>
    <p>Click the link below to verify your email:</p>
    <a href="${verificationUrl}">${verificationUrl}</a>
    <p>This link will expire in 24 hours.</p>
  `;

  return sendEmail(user.email, subject, html);
};

const sendPasswordResetEmail = async (user, resetToken) => {
  const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken.token}`;
  
  const subject = 'Password Reset Request';
  const html = `
    <h1>Reset Your Password</h1>
    <p>Click the link below to reset your password:</p>
    <a href="${resetUrl}">${resetUrl}</a>
    <p>This link will expire in 24 hours.</p>
    <p>If you did not request this, please ignore this email.</p>
  `;

  return sendEmail(user.email, subject, html);
};

module.exports = {
  sendEmail,
  sendVerificationEmail,
  sendPasswordResetEmail,
  createMailtrapClient,
  createSmtpTransporter
};
