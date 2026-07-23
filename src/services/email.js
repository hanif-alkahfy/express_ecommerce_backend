const nodemailer = require('nodemailer');
const { MailtrapClient } = require('mailtrap');

const { getEmailVerificationTemplate } = require('../templates/emails/emailVerification');
const { getPasswordResetTemplate } = require('../templates/emails/passwordReset');
const { getPaymentSuccessTemplate } = require('../templates/emails/paymentSuccess');

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

const sendWithMailtrap = async (to, subject, html, text) => {
  const client = createMailtrapClient();
  
  const info = await client.send({
    from: { 
      email: process.env.EMAIL_FROM || 'hello@demomailtrap.co', 
      name: 'E-Commerce' 
    },
    to: [{ email: to }],
    subject: subject,
    html: html,
    text: text
  });

  return info;
};

const sendWithSmtp = async (to, subject, html, text) => {
  const transporter = createSmtpTransporter();
  
  const info = await transporter.sendMail({
    from: process.env.EMAIL_FROM || 'noreply@yourdomain.com',
    to: to,
    subject: subject,
    html: html,
    text: text
  });

  return info;
};

const sendEmail = async (to, subject, html, text) => {
  let lastError;
  
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      if (EMAIL_PROVIDER === 'smtp') {
        return await sendWithSmtp(to, subject, html, text);
      }
      return await sendWithMailtrap(to, subject, html, text);
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
  
  const template = getEmailVerificationTemplate({
    name: user.name,
    verificationUrl: verificationUrl,
    expiryHours: 24
  });

  return sendEmail(user.email, template.subject, template.html, template.text);
};

const sendPasswordResetEmail = async (user, resetToken) => {
  const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken.token}`;
  
  const template = getPasswordResetTemplate({
    name: user.name,
    resetUrl: resetUrl,
    expiryHours: 24
  });

  return sendEmail(user.email, template.subject, template.html, template.text);
};

const sendPaymentSuccessEmail = async (user, orderData) => {
  const template = getPaymentSuccessTemplate({
    name: user.name,
    orderId: orderData.orderId,
    totalAmount: orderData.totalAmount,
    items: orderData.items,
    orderDate: orderData.orderDate,
    paymentMethod: orderData.paymentMethod,
    shippingAddress: orderData.shippingAddress
  });

  return sendEmail(user.email, template.subject, template.html, template.text);
};

module.exports = {
  sendEmail,
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendPaymentSuccessEmail,
  createMailtrapClient,
  createSmtpTransporter
};
