const jwt = require('jsonwebtoken');
const {
  generateAccessToken,
  generateRefreshToken,
  verifyToken,
  decodeToken,
  getTokenExpiry,
  ACCESS_TOKEN_EXPIRY,
  REFRESH_TOKEN_EXPIRY
} = require('../utils/jwt');

describe('JWT Utility', () => {
  const testPayload = {
    id: 1,
    email: 'test@example.com',
    role: 'customer'
  };

  describe('generateAccessToken', () => {
    test('should generate a valid access token', () => {
      const token = generateAccessToken(testPayload);
      
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3);
    });

    test('should throw error for empty payload', () => {
      expect(() => generateAccessToken()).toThrow('Payload is required');
    });

    test('should throw error for null payload', () => {
      expect(() => generateAccessToken(null)).toThrow('Payload is required');
    });

    test('should generate token with correct payload', () => {
      const token = generateAccessToken(testPayload);
      const decoded = jwt.decode(token);
      
      expect(decoded.id).toBe(1);
      expect(decoded.email).toBe('test@example.com');
      expect(decoded.role).toBe('customer');
    });
  });

  describe('generateRefreshToken', () => {
    test('should generate a valid refresh token', () => {
      const token = generateRefreshToken(testPayload);
      
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3);
    });

    test('should throw error for empty payload', () => {
      expect(() => generateRefreshToken()).toThrow('Payload is required');
    });

    test('should generate token with correct payload', () => {
      const token = generateRefreshToken(testPayload);
      const decoded = jwt.decode(token);
      
      expect(decoded.id).toBe(1);
      expect(decoded.email).toBe('test@example.com');
    });
  });

  describe('verifyToken', () => {
    test('should verify valid access token', () => {
      const token = generateAccessToken(testPayload);
      const decoded = verifyToken(token, 'access');
      
      expect(decoded.id).toBe(1);
      expect(decoded.email).toBe('test@example.com');
    });

    test('should verify valid refresh token', () => {
      const token = generateRefreshToken(testPayload);
      const decoded = verifyToken(token, 'refresh');
      
      expect(decoded.id).toBe(1);
    });

    test('should throw error for empty token', () => {
      expect(() => verifyToken()).toThrow('Token is required');
    });

    test('should throw error for null token', () => {
      expect(() => verifyToken(null)).toThrow('Token is required');
    });

    test('should throw error for invalid token', () => {
      expect(() => verifyToken('invalid.token.here')).toThrow();
    });

    test('should throw error for wrong token type', () => {
      const accessToken = generateAccessToken(testPayload);
      expect(() => verifyToken(accessToken, 'refresh')).toThrow();
    });
  });

  describe('decodeToken', () => {
    test('should decode valid token', () => {
      const token = generateAccessToken(testPayload);
      const decoded = decodeToken(token);
      
      expect(decoded.id).toBe(1);
      expect(decoded.email).toBe('test@example.com');
    });

    test('should return null for empty token', () => {
      expect(decodeToken()).toBeNull();
    });

    test('should return null for empty string', () => {
      expect(decodeToken('')).toBeNull();
    });

    test('should decode without verification', () => {
      const token = generateAccessToken(testPayload);
      const decoded = decodeToken(token);
      
      expect(decoded).toHaveProperty('id');
      expect(decoded).toHaveProperty('email');
      expect(decoded).not.toHaveProperty('exp');
    });
  });

  describe('getTokenExpiry', () => {
    test('should return expiry date for valid token', () => {
      const token = generateAccessToken(testPayload);
      const expiry = getTokenExpiry(token);
      
      expect(expiry).toBeInstanceOf(Date);
      expect(expiry.getTime()).toBeGreaterThan(Date.now());
    });

    test('should return null for invalid token', () => {
      expect(getTokenExpiry('invalid')).toBeNull();
    });

    test('should return null for empty token', () => {
      expect(getTokenExpiry()).toBeNull();
    });

    test('should return null for empty string', () => {
      expect(getTokenExpiry('')).toBeNull();
    });
  });

  describe('Token Expiry Constants', () => {
    test('should have correct access token expiry', () => {
      expect(ACCESS_TOKEN_EXPIRY).toBe('15m');
    });

    test('should have correct refresh token expiry', () => {
      expect(REFRESH_TOKEN_EXPIRY).toBe('7d');
    });
  });
});
