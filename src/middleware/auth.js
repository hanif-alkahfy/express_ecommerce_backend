const { verifyToken } = require('../utils/jwt');
const { AuthenticationError, AuthorizationError } = require('../utils/errors');
const logger = require('../config/logger');

const authenticateToken = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      throw new AuthenticationError('No token provided');
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      throw new AuthenticationError('Invalid authorization header format');
    }

    const token = parts[1];
    const decoded = verifyToken(token, 'access');
    
    req.user = decoded;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return next(new AuthenticationError('Token has expired'));
    }
    if (error.name === 'JsonWebTokenError') {
      return next(new AuthenticationError('Invalid token'));
    }
    if (error instanceof AuthenticationError) {
      return next(error);
    }
    logger.error(`Authentication error: ${error.message}`);
    return next(new AuthenticationError('Authentication failed'));
  }
};

const verifyEmail = (req, res, next) => {
  try {
    if (!req.user) {
      throw new AuthenticationError('User not authenticated');
    }

    if (!req.user.is_verified) {
      throw new AuthenticationError('Please verify your email first');
    }

    next();
  } catch (error) {
    next(error);
  }
};

const authorizeRole = (...allowedRoles) => {
  return (req, res, next) => {
    try {
      if (!req.user) {
        throw new AuthenticationError('User not authenticated');
      }

      if (!allowedRoles.includes(req.user.role)) {
        throw new AuthorizationError('You do not have permission to perform this action');
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

module.exports = {
  authenticateToken,
  verifyEmail,
  authorizeRole
};
