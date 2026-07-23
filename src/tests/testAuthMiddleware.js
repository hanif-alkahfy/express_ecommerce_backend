const {
  authenticateToken,
  verifyEmail,
  authorizeRole
} = require('../middleware/auth');
const { AuthenticationError, AuthorizationError } = require('../utils/errors');
const { generateAccessToken } = require('../utils/jwt');

describe('Authentication Middleware', () => {
  let mockReq;
  let mockRes;
  let mockNext;

  beforeEach(() => {
    mockReq = {
      headers: {}
    };
    mockRes = {};
    mockNext = jest.fn();
  });

  describe('authenticateToken', () => {
    const testPayload = {
      id: 1,
      email: 'test@example.com',
      role: 'customer',
      is_verified: true
    };

    test('should authenticate valid token', () => {
      const token = generateAccessToken(testPayload);
      mockReq.headers.authorization = `Bearer ${token}`;

      authenticateToken(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
      expect(mockReq.user).toBeDefined();
      expect(mockReq.user.id).toBe(1);
      expect(mockReq.user.email).toBe('test@example.com');
    });

    test('should reject missing authorization header', () => {
      authenticateToken(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(AuthenticationError));
      expect(mockNext.mock.calls[0][0].message).toBe('No token provided');
    });

    test('should reject invalid authorization format', () => {
      mockReq.headers.authorization = 'InvalidFormat';

      authenticateToken(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(AuthenticationError));
      expect(mockNext.mock.calls[0][0].message).toBe('Invalid authorization header format');
    });

    test('should reject invalid token', () => {
      mockReq.headers.authorization = 'Bearer invalid.token.here';

      authenticateToken(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(AuthenticationError));
    });

    test('should reject expired token', () => {
      const expiredToken = generateAccessToken(testPayload);
      mockReq.headers.authorization = `Bearer ${expiredToken}`;

      authenticateToken(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(AuthenticationError));
    });
  });

  describe('verifyEmail', () => {
    test('should pass when user is verified', () => {
      mockReq.user = { id: 1, is_verified: true };

      verifyEmail(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });

    test('should reject when user is not verified', () => {
      mockReq.user = { id: 1, is_verified: false };

      verifyEmail(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(AuthenticationError));
      expect(mockNext.mock.calls[0][0].message).toBe('Please verify your email first');
    });

    test('should reject when user is not authenticated', () => {
      mockReq.user = null;

      verifyEmail(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(AuthenticationError));
      expect(mockNext.mock.calls[0][0].message).toBe('User not authenticated');
    });
  });

  describe('authorizeRole', () => {
    test('should pass for authorized role', () => {
      mockReq.user = { id: 1, role: 'admin' };
      const middleware = authorizeRole('admin', 'store_owner');

      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });

    test('should reject for unauthorized role', () => {
      mockReq.user = { id: 1, role: 'customer' };
      const middleware = authorizeRole('admin', 'store_owner');

      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(AuthorizationError));
    });

    test('should reject when user is not authenticated', () => {
      mockReq.user = null;
      const middleware = authorizeRole('admin');

      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(AuthenticationError));
      expect(mockNext.mock.calls[0][0].message).toBe('User not authenticated');
    });

    test('should allow multiple roles correctly', () => {
      mockReq.user = { id: 1, role: 'store_owner' };
      const middleware = authorizeRole('admin', 'store_owner');

      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });
  });
});
