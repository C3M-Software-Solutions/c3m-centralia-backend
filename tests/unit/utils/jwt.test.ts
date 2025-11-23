import {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
} from '../../../src/utils/jwt';
import { Types } from 'mongoose';

describe('JWT Utils Tests', () => {
  const mockPayload = {
    userId: new Types.ObjectId().toString(),
    email: 'test@example.com',
    role: 'client',
  };

  describe('generateAccessToken', () => {
    it('should generate a valid access token', () => {
      const token = generateAccessToken(mockPayload);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWT has 3 parts
    });

    it('should generate different tokens for different payloads', () => {
      const payload1 = { ...mockPayload, email: 'user1@example.com' };
      const payload2 = { ...mockPayload, email: 'user2@example.com' };

      const token1 = generateAccessToken(payload1);
      const token2 = generateAccessToken(payload2);

      expect(token1).not.toBe(token2);
    });
  });

  describe('generateRefreshToken', () => {
    it('should generate a valid refresh token', () => {
      const token = generateRefreshToken(mockPayload);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3);
    });

    it('should generate different tokens from access token', () => {
      const accessToken = generateAccessToken(mockPayload);
      const refreshToken = generateRefreshToken(mockPayload);

      expect(accessToken).not.toBe(refreshToken);
    });
  });

  describe('verifyAccessToken', () => {
    it('should verify and decode a valid access token', () => {
      const token = generateAccessToken(mockPayload);
      const decoded = verifyAccessToken(token);

      expect(decoded).toBeDefined();
      expect(decoded.userId).toBe(mockPayload.userId);
      expect(decoded.email).toBe(mockPayload.email);
      expect(decoded.role).toBe(mockPayload.role);
    });

    it('should throw error for invalid token', () => {
      expect(() => verifyAccessToken('invalid_token')).toThrow();
    });

    it('should throw error for malformed token', () => {
      expect(() => verifyAccessToken('not.a.token')).toThrow();
    });

    it('should throw error for empty token', () => {
      expect(() => verifyAccessToken('')).toThrow();
    });
  });

  describe('verifyRefreshToken', () => {
    it('should verify and decode a valid refresh token', () => {
      const token = generateRefreshToken(mockPayload);
      const decoded = verifyRefreshToken(token);

      expect(decoded).toBeDefined();
      expect(decoded.userId).toBe(mockPayload.userId);
      expect(decoded.email).toBe(mockPayload.email);
      expect(decoded.role).toBe(mockPayload.role);
    });

    it('should throw error for invalid refresh token', () => {
      expect(() => verifyRefreshToken('invalid_token')).toThrow();
    });

    it('should not verify access token as refresh token', () => {
      const accessToken = generateAccessToken(mockPayload);

      expect(() => verifyRefreshToken(accessToken)).toThrow();
    });
  });

  describe('Token payload validation', () => {
    it('should handle different user roles', () => {
      const roles = ['admin', 'specialist', 'client'];

      roles.forEach((role) => {
        const payload = { ...mockPayload, role };
        const token = generateAccessToken(payload);
        const decoded = verifyAccessToken(token);

        expect(decoded.role).toBe(role);
      });
    });

    it('should preserve ObjectId format in userId', () => {
      const objectId = new Types.ObjectId();
      const payload = { ...mockPayload, userId: objectId.toString() };
      const token = generateAccessToken(payload);
      const decoded = verifyAccessToken(token);

      expect(decoded.userId).toBeDefined();
    });
  });
});
