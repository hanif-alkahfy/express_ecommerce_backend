const db = require('../models');
const { register, verifyEmail, validateRegistrationInput } = require('../controllers/authController');
const { ValidationError, ConflictError } = require('../utils/errors');

describe('User Registration', () => {
  describe('validateRegistrationInput', () => {
    test('should return no errors for valid input', () => {
      const errors = validateRegistrationInput('test@example.com', 'password123', 'John Doe');
      expect(errors).toHaveLength(0);
    });

    test('should return error for missing email', () => {
      const errors = validateRegistrationInput(null, 'password123', 'John Doe');
      expect(errors).toContain('Email is required');
    });

    test('should return error for invalid email format', () => {
      const errors = validateRegistrationInput('invalid-email', 'password123', 'John Doe');
      expect(errors).toContain('Invalid email format');
    });

    test('should return error for missing password', () => {
      const errors = validateRegistrationInput('test@example.com', null, 'John Doe');
      expect(errors).toContain('Password is required');
    });

    test('should return error for short password', () => {
      const errors = validateRegistrationInput('test@example.com', '123', 'John Doe');
      expect(errors).toContain('Password must be at least 6 characters');
    });

    test('should return error for missing name', () => {
      const errors = validateRegistrationInput('test@example.com', 'password123', null);
      expect(errors).toContain('Name is required');
    });

    test('should return error for short name', () => {
      const errors = validateRegistrationInput('test@example.com', 'password123', 'J');
      expect(errors).toContain('Name must be at least 2 characters');
    });

    test('should return multiple errors for invalid input', () => {
      const errors = validateRegistrationInput('', '', '');
      expect(errors.length).toBeGreaterThan(1);
    });
  });

  describe('register', () => {
    beforeEach(() => {
      jest.spyOn(db.User, 'findOne').mockResolvedValue(null);
      jest.spyOn(db.User, 'create').mockResolvedValue({
        id: 1,
        email: 'test@example.com',
        name: 'Test User',
        toJSON: function() { return { id: this.id, email: this.email, name: this.name }; }
      });
      jest.spyOn(db.VerificationToken, 'createForUser').mockResolvedValue({
        id: 1,
        token: 'test-token-123'
      });
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    test('should register user with valid data', async () => {
      const req = {
        body: {
          email: 'test@example.com',
          password: 'password123',
          name: 'Test User'
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();

      await register(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true
      }));
    });

    test('should throw ConflictError for duplicate email', async () => {
      db.User.findOne.mockResolvedValueOnce({ id: 1, email: 'test@example.com' });

      const req = {
        body: {
          email: 'test@example.com',
          password: 'password123',
          name: 'Test User'
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();

      await register(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(ConflictError));
    });

    test('should throw ValidationError for invalid input', async () => {
      const req = {
        body: {
          email: 'invalid',
          password: '123',
          name: ''
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();

      await register(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(ValidationError));
    });
  });

  describe('verifyEmail', () => {
    beforeEach(() => {
      jest.spyOn(db.VerificationToken, 'findByToken').mockResolvedValue(null);
      jest.spyOn(db.User, 'findByPk').mockResolvedValue(null);
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    test('should verify email with valid token', async () => {
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        update: jest.fn().mockResolvedValue(true)
      };
      const mockToken = {
        id: 1,
        user_id: 1,
        token: 'valid-token',
        used: false,
        isExpired: jest.fn().mockReturnValue(false),
        markAsUsed: jest.fn().mockResolvedValue(true)
      };

      db.VerificationToken.findByToken.mockResolvedValueOnce(mockToken);
      db.User.findByPk.mockResolvedValueOnce(mockUser);

      const req = { query: { token: 'valid-token' } };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();

      await verifyEmail(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(mockUser.update).toHaveBeenCalledWith({ is_verified: true });
      expect(mockToken.markAsUsed).toHaveBeenCalled();
    });

    test('should reject missing token', async () => {
      const req = { query: {} };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();

      await verifyEmail(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(ValidationError));
    });

    test('should reject invalid token', async () => {
      db.VerificationToken.findByToken.mockResolvedValueOnce(null);

      const req = { query: { token: 'invalid-token' } };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();

      await verifyEmail(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(ValidationError));
    });

    test('should reject already used token', async () => {
      const mockToken = {
        id: 1,
        used: true,
        isExpired: jest.fn().mockReturnValue(false)
      };

      db.VerificationToken.findByToken.mockResolvedValueOnce(mockToken);

      const req = { query: { token: 'used-token' } };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();

      await verifyEmail(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(ValidationError));
    });

    test('should reject expired token', async () => {
      const mockToken = {
        id: 1,
        used: false,
        isExpired: jest.fn().mockReturnValue(true)
      };

      db.VerificationToken.findByToken.mockResolvedValueOnce(mockToken);

      const req = { query: { token: 'expired-token' } };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();

      await verifyEmail(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(ValidationError));
    });
  });
});
