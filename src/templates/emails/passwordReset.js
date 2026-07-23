const getPasswordResetTemplate = (data) => {
  const { name, resetUrl, expiryHours } = data;
  const expiry = expiryHours || 24;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Password Reset</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: #f8f9fa; padding: 30px; border-radius: 10px;">
    <h1 style="color: #e74c3c; margin-bottom: 20px;">Reset Your Password</h1>
    <p>Hi ${name || 'there'},</p>
    <p>We received a request to reset your password. Click the button below to create a new password:</p>
    <div style="text-align: center; margin: 30px 0;">
      <a href="${resetUrl}" style="background: #e74c3c; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">Reset Password</a>
    </div>
    <p>Or copy and paste this link in your browser:</p>
    <p style="word-break: break-all; color: #e74c3c;">${resetUrl}</p>
    <p style="color: #e74c3c; margin-top: 20px;">This link will expire in ${expiry} hours.</p>
    <div style="background: #fff3cd; padding: 15px; border-radius: 5px; margin-top: 20px;">
      <p style="margin: 0; color: #856404;"><strong>Security Notice:</strong></p>
      <ul style="margin: 10px 0 0 0; color: #856404;">
        <li>This link can only be used once</li>
        <li>If you didn't request a password reset, please ignore this email</li>
        <li>Never share this link with anyone</li>
      </ul>
    </div>
  </div>
  <footer style="text-align: center; margin-top: 20px; color: #7f8c8d; font-size: 12px;">
    <p>&copy; ${new Date().getFullYear()} E-Commerce. All rights reserved.</p>
  </footer>
</body>
</html>`;

  const text = `
Reset Your Password
===================

Hi ${name || 'there'},

We received a request to reset your password. Visit the link below to create a new password:

${resetUrl}

This link will expire in ${expiry} hours.

Security Notice:
- This link can only be used once
- If you didn't request a password reset, please ignore this email
- Never share this link with anyone

© ${new Date().getFullYear()} E-Commerce. All rights reserved.
`;

  return { html, text, subject: 'Password Reset Request' };
};

module.exports = { getPasswordResetTemplate };
