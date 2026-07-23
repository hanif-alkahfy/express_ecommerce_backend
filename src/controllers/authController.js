const db = require('../models');
const { hashPassword, comparePassword } = require('../utils/password');
const { ValidationError, ConflictError, AuthenticationError } = require('../utils/errors');
const { sendVerificationEmail, sendPasswordResetEmail } = require('../services/email');
const logger = require('../config/logger');

const validateRegistrationInput = (email, password, name) => {
  const errors = [];
  
  if (!email || typeof email !== 'string') {
    errors.push('Email is required');
  } else {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      errors.push('Invalid email format');
    }
  }

  if (!password || typeof password !== 'string') {
    errors.push('Password is required');
  } else {
    if (password.length < 6) {
      errors.push('Password must be at least 6 characters');
    }
  }

  if (!name || typeof name !== 'string') {
    errors.push('Name is required');
  } else {
    if (name.trim().length < 2) {
      errors.push('Name must be at least 2 characters');
    }
  }

  return errors;
};

const register = async (req, res, next) => {
  try {
    const { email, password, name } = req.body;

    const validationErrors = validateRegistrationInput(email, password, name);
    if (validationErrors.length > 0) {
      throw new ValidationError(validationErrors.join(', '));
    }

    const normalizedEmail = email.toLowerCase().trim();
    
    const existingUser = await db.User.findOne({ 
      where: { email: normalizedEmail } 
    });
    
    if (existingUser) {
      throw new ConflictError('Email already registered');
    }

    const hashedPassword = await hashPassword(password);

    const user = await db.User.create({
      email: normalizedEmail,
      password_hash: hashedPassword,
      name: name.trim(),
      role: 'customer',
      is_verified: false
    });

    const verificationToken = await db.VerificationToken.createForUser(
      user.id,
      'email_verification'
    );

    try {
      await sendVerificationEmail(user, verificationToken);
    } catch (emailError) {
      logger.warn(`Failed to send verification email to ${user.email}: ${emailError.message}`);
    }

    logger.info(`User registered: ${user.email}`);

    res.status(201).json({
      success: true,
      message: 'Registration successful. Please check your email to verify your account.',
      data: {
        user: user.toJSON()
      }
    });
  } catch (error) {
    next(error);
  }
};

const verifyEmail = async (req, res, next) => {
  try {
    const { token } = req.query;

    if (!token || typeof token !== 'string') {
      throw new ValidationError('Verification token is required');
    }

    const verificationToken = await db.VerificationToken.findByToken(token, 'email_verification');

    if (!verificationToken) {
      throw new ValidationError('Invalid verification token');
    }

    if (verificationToken.used) {
      throw new ValidationError('Token has already been used');
    }

    if (verificationToken.isExpired()) {
      throw new ValidationError('Verification token has expired');
    }

    const user = await db.User.findByPk(verificationToken.user_id);

    if (!user) {
      throw new ValidationError('User not found');
    }

    await user.update({ is_verified: true });

    await verificationToken.markAsUsed();

    logger.info(`Email verified for user: ${user.email}`);

    res.status(200).json({
      success: true,
      message: 'Email verified successfully. You can now log in.'
    });
  } catch (error) {
    next(error);
  }
};

const resendVerification = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email || typeof email !== 'string') {
      throw new ValidationError('Email is required');
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new ValidationError('Invalid email format');
    }

    const normalizedEmail = email.toLowerCase().trim();
    
    const user = await db.User.findOne({ 
      where: { email: normalizedEmail } 
    });

    if (!user) {
      res.status(200).json({
        success: true,
        message: 'If that email exists, a verification link has been sent.'
      });
      return;
    }

    if (user.is_verified) {
      throw new ConflictError('Email is already verified');
    }

    await db.VerificationToken.update(
      { used: true },
      {
        where: {
          user_id: user.id,
          token_type: 'email_verification',
          used: false
        }
      }
    );

    const verificationToken = await db.VerificationToken.createForUser(
      user.id,
      'email_verification'
    );

    try {
      await sendVerificationEmail(user, verificationToken);
    } catch (emailError) {
      logger.warn(`Failed to send verification email to ${user.email}: ${emailError.message}`);
      throw new Error('Failed to send verification email. Please try again later.');
    }

    logger.info(`Verification email resent to user: ${user.email}`);

    res.status(200).json({
      success: true,
      message: 'If that email exists, a verification link has been sent.'
    });
  } catch (error) {
    next(error);
  }
};

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || typeof email !== 'string') {
      throw new ValidationError('Email is required');
    }

    if (!password || typeof password !== 'string') {
      throw new ValidationError('Password is required');
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new ValidationError('Invalid email format');
    }

    const normalizedEmail = email.toLowerCase().trim();
    
    const user = await db.User.findOne({ 
      where: { email: normalizedEmail } 
    });

    if (!user) {
      throw new AuthenticationError('Invalid email or password');
    }

    if (user.oauth_provider) {
      throw new AuthenticationError('Please login with ' + user.oauth_provider);
    }

    if (!user.password_hash) {
      throw new AuthenticationError('Invalid email or password');
    }

    const isPasswordValid = await comparePassword(password, user.password_hash);
    
    if (!isPasswordValid) {
      throw new AuthenticationError('Invalid email or password');
    }

    const tokens = user.generateAuthTokens();

    logger.info(`User logged in: ${user.email}`);

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        user: user.toJSON(),
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresIn: tokens.expiresIn
      }
    });
  } catch (error) {
    next(error);
  }
};

const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email || typeof email !== 'string') {
      throw new ValidationError('Email is required');
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new ValidationError('Invalid email format');
    }

    const normalizedEmail = email.toLowerCase().trim();
    
    const user = await db.User.findOne({ 
      where: { email: normalizedEmail } 
    });

    if (!user) {
      res.status(200).json({
        success: true,
        message: 'If that email exists, a password reset link has been sent.'
      });
      return;
    }

    await db.VerificationToken.update(
      { used: true },
      {
        where: {
          user_id: user.id,
          token_type: 'password_reset',
          used: false
        }
      }
    );

    const resetToken = await db.VerificationToken.createForUser(
      user.id,
      'password_reset'
    );

    try {
      await sendPasswordResetEmail(user, resetToken);
    } catch (emailError) {
      logger.warn(`Failed to send password reset email to ${user.email}: ${emailError.message}`);
      throw new Error('Failed to send password reset email. Please try again later.');
    }

    logger.info(`Password reset requested for user: ${user.email}`);

    res.status(200).json({
      success: true,
      message: 'If that email exists, a password reset link has been sent.'
    });
  } catch (error) {
    next(error);
  }
};

const resetPassword = async (req, res, next) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || typeof token !== 'string') {
      throw new ValidationError('Reset token is required');
    }

    if (!newPassword || typeof newPassword !== 'string') {
      throw new ValidationError('New password is required');
    }

    if (newPassword.length < 6) {
      throw new ValidationError('Password must be at least 6 characters');
    }

    const resetToken = await db.VerificationToken.findByToken(token, 'password_reset');

    if (!resetToken) {
      throw new ValidationError('Invalid reset token');
    }

    if (resetToken.used) {
      throw new ValidationError('Token has already been used');
    }

    if (resetToken.isExpired()) {
      throw new ValidationError('Reset token has expired');
    }

    const user = await db.User.findByPk(resetToken.user_id);

    if (!user) {
      throw new ValidationError('User not found');
    }

    const hashedPassword = await hashPassword(newPassword);

    await user.update({ password_hash: hashedPassword });

    await resetToken.markAsUsed();

    logger.info(`Password reset completed for user: ${user.email}`);

    res.status(200).json({
      success: true,
      message: 'Password reset successful. You can now log in with your new password.'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  verifyEmail,
  resendVerification,
  login,
  forgotPassword,
  resetPassword,
  validateRegistrationInput
};
