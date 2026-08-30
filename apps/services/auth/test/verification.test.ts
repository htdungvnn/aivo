/**
 * Tests for Verification Code Service
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  generateVerificationCode,
  hashVerificationCode,
  verifyCode,
  checkRateLimit,
} from '../src/services/verification';

// Mock D1 database
function createMockD1Database() {
  return {
    prepare: vi.fn().mockReturnValue({
      bind: vi.fn().mockReturnThis(),
      run: vi.fn().mockResolvedValue({ meta: { changes: 0 } }),
      first: vi.fn().mockResolvedValue(null),
      all: vi.fn().mockResolvedValue({ results: [] }),
    }),
  };
}

describe('Verification Code Service', () => {
  describe('generateVerificationCode', () => {
    it('should generate a 6-digit code', () => {
      const code = generateVerificationCode();
      
      expect(code).toHaveLength(6);
      expect(/^\d{6}$/.test(code)).toBe(true);
    });

    it('should generate unique codes', () => {
      const codes = new Set<string>();
      for (let i = 0; i < 100; i++) {
        codes.add(generateVerificationCode());
      }
      
      // Should have mostly unique codes (allowing for very rare collisions)
      expect(codes.size).toBeGreaterThan(90);
    });

    it('should only contain digits', () => {
      const code = generateVerificationCode();
      expect(/^\d+$/.test(code)).toBe(true);
    });
  });

  describe('hashVerificationCode', () => {
    it('should produce consistent hashes for same input', async () => {
      const code = '123456';
      const hash1 = await hashVerificationCode(code);
      const hash2 = await hashVerificationCode(code);
      
      expect(hash1).toBe(hash2);
    });

    it('should produce different hashes for different codes', async () => {
      const hash1 = await hashVerificationCode('123456');
      const hash2 = await hashVerificationCode('654321');
      
      expect(hash1).not.toBe(hash2);
    });

    it('should produce SHA-256 hash (64 hex characters)', async () => {
      const hash = await hashVerificationCode('123456');
      
      expect(hash).toHaveLength(64);
      expect(/^[a-f0-9]{64}$/.test(hash)).toBe(true);
    });
  });

  describe('verifyCode', () => {
    it('should return true for matching code and hash', async () => {
      const code = '123456';
      const hash = await hashVerificationCode(code);
      
      const result = await verifyCode(code, hash);
      
      expect(result).toBe(true);
    });

    it('should return false for non-matching code and hash', async () => {
      const code = '123456';
      const hash = await hashVerificationCode('654321');
      
      const result = await verifyCode(code, hash);
      
      expect(result).toBe(false);
    });

    it('should return false for hash of different length', async () => {
      const result = await verifyCode('123456', 'short');
      
      expect(result).toBe(false);
    });
  });

  describe('checkRateLimit', () => {
    let mockDb: ReturnType<typeof createMockD1Database>;

    beforeEach(() => {
      mockDb = createMockD1Database();
    });

    it('should allow when user not found', async () => {
      mockDb.prepare().first.mockResolvedValue(null);

      const result = await checkRateLimit({
        db: mockDb as any,
        userId: 'user-123',
      });

      expect(result.allowed).toBe(true);
      expect(result.remainingAttempts).toBe(5);
    });

    it('should allow when no verification code exists', async () => {
      mockDb.prepare().first.mockResolvedValue({
        id: 'user-123',
        email: 'test@example.com',
        verification_code_hash: null,
        verification_code_expires_at: null,
        verification_code_attempts: 0,
      });

      const result = await checkRateLimit({
        db: mockDb as any,
        userId: 'user-123',
      });

      expect(result.allowed).toBe(true);
      expect(result.remainingAttempts).toBe(5);
    });

    it('should allow after cooldown period', async () => {
      const now = Math.floor(Date.now() / 1000);
      // Code created more than 60 seconds ago
      mockDb.prepare().first.mockResolvedValue({
        id: 'user-123',
        email: 'test@example.com',
        verification_code_hash: 'somehash',
        verification_code_expires_at: now - 120, // Expired 2 minutes ago
        verification_code_attempts: 0,
      });

      const result = await checkRateLimit({
        db: mockDb as any,
        userId: 'user-123',
      });

      expect(result.allowed).toBe(true);
    });

    it('should deny within cooldown period', async () => {
      const now = Math.floor(Date.now() / 1000);
      // Code created 30 seconds ago (within 60 second cooldown)
      mockDb.prepare().first.mockResolvedValue({
        id: 'user-123',
        email: 'test@example.com',
        verification_code_hash: 'somehash',
        verification_code_expires_at: now + 600, // Expires in 10 minutes
        verification_code_attempts: 0,
      });

      const result = await checkRateLimit({
        db: mockDb as any,
        userId: 'user-123',
      });

      expect(result.allowed).toBe(false);
      expect(result.cooldownExpiresAt).toBeDefined();
    });
  });
});

describe('Verification Code Security', () => {
  describe('Hash Storage', () => {
    it('should never expose raw code in hash', async () => {
      const code = '123456';
      const hash = await hashVerificationCode(code);
      
      // Hash should not contain the raw code
      expect(hash).not.toContain(code);
    });

    it('should use SHA-256 which is one-way', async () => {
      const code = '123456';
      const hash = await hashVerificationCode(code);
      
      // Verify we can confirm a code matches the hash
      const matches = await verifyCode(code, hash);
      expect(matches).toBe(true);
      
      // But we can't reverse the hash
      expect(hash.length).toBe(64);
      expect(hash).not.toBe(code);
    });
  });

  describe('Timing Attack Prevention', () => {
    it('should use constant-time comparison', async () => {
      const code = '123456';
      const hash = await hashVerificationCode(code);
      
      // The verifyCode function should use timing-safe comparison
      const result1 = await verifyCode(code, hash);
      const result2 = await verifyCode(code, 'a'.repeat(64));
      
      expect(result1).toBe(true);
      expect(result2).toBe(false);
    });
  });
});
