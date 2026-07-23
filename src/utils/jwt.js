const jwt = require('jsonwebtoken');

const ACCESS_TOKEN_SECRET = process.env.JWT_ACCESS_SECRET || 'dev_jwt_access_secret';
const REFRESH_TOKEN_SECRET = process.env.JWT_REFRESH_SECRET || 'dev_jwt_refresh_secret';
const ACCESS_TOKEN_EXPIRY = process.env.JWT_ACCESS_EXPIRY || '15m';
const REFRESH_TOKEN_EXPIRY = process.env.JWT_REFRESH_EXPIRY || '7d';

function generateAccessToken(payload) {
  if (!payload) {
    throw new Error('Payload is required');
  }
  return jwt.sign(payload, ACCESS_TOKEN_SECRET, {
    expiresIn: ACCESS_TOKEN_EXPIRY
  });
}

function generateRefreshToken(payload) {
  if (!payload) {
    throw new Error('Payload is required');
  }
  return jwt.sign(payload, REFRESH_TOKEN_SECRET, {
    expiresIn: REFRESH_TOKEN_EXPIRY
  });
}

function verifyToken(token, type = 'access') {
  if (!token) {
    throw new Error('Token is required');
  }
  const secret = type === 'refresh' ? REFRESH_TOKEN_SECRET : ACCESS_TOKEN_SECRET;
  return jwt.verify(token, secret);
}

function decodeToken(token) {
  if (!token) {
    return null;
  }
  return jwt.decode(token);
}

function getTokenExpiry(token) {
  const decoded = decodeToken(token);
  if (!decoded || !decoded.exp) {
    return null;
  }
  return new Date(decoded.exp * 1000);
}

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyToken,
  decodeToken,
  getTokenExpiry,
  ACCESS_TOKEN_SECRET,
  REFRESH_TOKEN_SECRET,
  ACCESS_TOKEN_EXPIRY,
  REFRESH_TOKEN_EXPIRY
};
