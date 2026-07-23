const { hashPassword, comparePassword, getBcryptRounds, BCRYPT_ROUNDS } = require('../utils/password');

describe('Password Hashing Utility', () => {
  describe('hashPassword', () => {
    test('should hash a valid password', async () => {
      const password = 'TestPassword123!';
      const hashed = await hashPassword(password);
      
      expect(hashed).toBeDefined();
      expect(typeof hashed).toBe('string');
      expect(hashed).toMatch(/^\$2[aby]\$\d{2}\$.{53}$/);
    });

    test('should produce different hashes for the same password', async () => {
      const password = 'TestPassword123!';
      const hash1 = await hashPassword(password);
      const hash2 = await hashPassword(password);
      
      expect(hash1).not.toBe(hash2);
    });

    test('should throw error for empty password', async () => {
      await expect(hashPassword('')).rejects.toThrow('Password is required');
    });

    test('should throw error for null password', async () => {
      await expect(hashPassword(null)).rejects.toThrow('Password is required');
    });

    test('should throw error for undefined password', async () => {
      await expect(hashPassword(undefined)).rejects.toThrow('Password is required');
    });

    test('should throw error for non-string password', async () => {
      await expect(hashPassword(12345)).rejects.toThrow('Password must be a string');
    });

    test('should throw error for password less than 6 characters', async () => {
      await expect(hashPassword('abc')).rejects.toThrow('Password must be at least 6 characters');
    });

    test('should use configured bcrypt rounds', async () => {
      const password = 'TestPassword123!';
      const hashed = await hashPassword(password);
      
      expect(hashed).toMatch(/^\$2b\$10\$/);
    });
  });

  describe('comparePassword', () => {
    test('should return true for correct password', async () => {
      const password = 'TestPassword123!';
      const hashed = await hashPassword(password);
      
      const result = await comparePassword(password, hashed);
      expect(result).toBe(true);
    });

    test('should return false for incorrect password', async () => {
      const password = 'TestPassword123!';
      const hashed = await hashPassword(password);
      
      const result = await comparePassword('WrongPassword', hashed);
      expect(result).toBe(false);
    });

    test('should return false for empty password', async () => {
      const password = 'TestPassword123!';
      const hashed = await hashPassword(password);
      
      const result = await comparePassword('', hashed);
      expect(result).toBe(false);
    });

    test('should return false for empty hashed password', async () => {
      const result = await comparePassword('TestPassword123!', '');
      expect(result).toBe(false);
    });

    test('should return false for null password', async () => {
      const password = 'TestPassword123!';
      const hashed = await hashPassword(password);
      
      const result = await comparePassword(null, hashed);
      expect(result).toBe(false);
    });

    test('should return false for null hashed password', async () => {
      const result = await comparePassword('TestPassword123!', null);
      expect(result).toBe(false);
    });
  });

  describe('getBcryptRounds', () => {
    test('should return the bcrypt rounds number', () => {
      const rounds = getBcryptRounds();
      expect(typeof rounds).toBe('number');
      expect(rounds).toBe(10);
    });
  });

  describe('BCRYPT_ROUNDS constant', () => {
    test('should be 10 by default', () => {
      expect(BCRYPT_ROUNDS).toBe(10);
    });
  });
});
