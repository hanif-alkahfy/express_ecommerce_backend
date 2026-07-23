const db = require('../models');
const { hashPassword } = require('../utils/password');
const { ValidationError, ConflictError } = require('../utils/errors');
const { sendVerificationEmail } = require('../services/email');
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

module.exports = {
  register,
  verifyEmail,
  validateRegistrationInput
};
