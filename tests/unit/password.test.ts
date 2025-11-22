import { hashPassword, comparePassword } from '../../src/utils/password';

describe('Password Utils Tests', () => {
  describe('hashPassword', () => {
    it('should hash a password successfully', async () => {
      const password = 'password123';
      const hashedPassword = await hashPassword(password);

      expect(hashedPassword).toBeDefined();
      expect(hashedPassword).not.toBe(password);
      expect(hashedPassword.length).toBeGreaterThan(0);
    });

    it('should generate different hashes for same password', async () => {
      const password = 'password123';
      const hash1 = await hashPassword(password);
      const hash2 = await hashPassword(password);

      expect(hash1).not.toBe(hash2); // Bcrypt uses salt, so hashes will be different
    });

    it('should handle empty string', async () => {
      const password = '';
      const hashedPassword = await hashPassword(password);

      expect(hashedPassword).toBeDefined();
      expect(hashedPassword.length).toBeGreaterThan(0);
    });

    it('should handle long passwords', async () => {
      const password = 'a'.repeat(100);
      const hashedPassword = await hashPassword(password);

      expect(hashedPassword).toBeDefined();
      expect(hashedPassword.length).toBeGreaterThan(0);
    });
  });

  describe('comparePassword', () => {
    it('should return true for correct password', async () => {
      const password = 'password123';
      const hashedPassword = await hashPassword(password);

      const result = await comparePassword(password, hashedPassword);

      expect(result).toBe(true);
    });

    it('should return false for incorrect password', async () => {
      const password = 'password123';
      const wrongPassword = 'wrongpassword';
      const hashedPassword = await hashPassword(password);

      const result = await comparePassword(wrongPassword, hashedPassword);

      expect(result).toBe(false);
    });

    it('should return false for empty password', async () => {
      const password = 'password123';
      const hashedPassword = await hashPassword(password);

      const result = await comparePassword('', hashedPassword);

      expect(result).toBe(false);
    });

    it('should handle case-sensitive comparison', async () => {
      const password = 'Password123';
      const hashedPassword = await hashPassword(password);

      const result1 = await comparePassword('Password123', hashedPassword);
      const result2 = await comparePassword('password123', hashedPassword);

      expect(result1).toBe(true);
      expect(result2).toBe(false);
    });
  });
});
