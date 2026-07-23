const getEmailVerificationTemplate = (data) => {
  const { name, verificationUrl, expiryHours } = data;
  const expiry = expiryHours || 24;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Email Verification</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: #f8f9fa; padding: 30px; border-radius: 10px;">
    <h1 style="color: #2c3e50; margin-bottom: 20px;">Verify Your Email</h1>
    <p>Hi ${name || 'there'},</p>
    <p>Thank you for registering with us. Please verify your email address by clicking the button below:</p>
    <div style="text-align: center; margin: 30px 0;">
      <a href="${verificationUrl}" style="background: #3498db; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">Verify Email</a>
    </div>
    <p>Or copy and paste this link in your browser:</p>
    <p style="word-break: break-all; color: #3498db;">${verificationUrl}</p>
    <p style="color: #e74c3c; margin-top: 20px;">This link will expire in ${expiry} hours.</p>
    <p style="color: #7f8c8d; font-size: 14px; margin-top: 30px;">If you didn't create an account, please ignore this email.</p>
  </div>
  <footer style="text-align: center; margin-top: 20px; color: #7f8c8d; font-size: 12px;">
    <p>&copy; ${new Date().getFullYear()} E-Commerce. All rights reserved.</p>
  </footer>
</body>
</html>`;

  const text = `
Verify Your Email
=================

Hi ${name || 'there'},

Thank you for registering with us. Please verify your email address by visiting the link below:

${verificationUrl}

This link will expire in ${expiry} hours.

If you didn't create an account, please ignore this email.

© ${new Date().getFullYear()} E-Commerce. All rights reserved.
`;

  return { html, text, subject: 'Email Verification' };
};

module.exports = { getEmailVerificationTemplate };
