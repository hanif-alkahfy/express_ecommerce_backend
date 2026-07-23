const { MailtrapClient } = require('mailtrap');

const createMailtrapClient = () => {
  return new MailtrapClient({
    token: process.env.MAILTRAP_API_KEY,
    sandbox: process.env.MAILTRAP_SANDBOX === 'true',
    testInboxId: process.env.MAILTRAP_INBOX_ID ? parseInt(process.env.MAILTRAP_INBOX_ID) : undefined
  });
};

const sendEmail = async (to, subject, html) => {
  try {
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
  } catch (error) {
    console.error('Email send error:', error);
    throw error;
  }
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
  createMailtrapClient
};
