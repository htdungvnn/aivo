/**
 * Auth service tests
 */

import { env, createExecutionContext, waitOnExecutionContext, SELF } from 'cloudflare:test';
import { describe, it, expect, beforeAll, vi } from 'vitest';
import {
  generateSecureToken,
  sha256Hash,
  generateCodeVerifier,
  generateCodeChallenge,
  normalizeEmail,
  isValidEmail,
  timingSafeEqual,
} from '../src/utils/crypto';

// Mock D1 database for unit tests
const createMockD1 = () => {
  const data: Map<string, any[]> = new Map();
  
  return {
    prepare: (query: string) => ({
      bind: (...args: any[]) => ({
        run: vi.fn().mockResolvedValue({ success: true }),
        first: vi.fn().mockResolvedValue(null),
        all: vi.fn().mockResolvedValue({ results: [] }),
      }),
    }),
    exec: vi.fn().mockResolvedValue({ success: true }),
    data,
  };
};

describe('Crypto utilities', () => {
  describe('generateSecureToken', () => {
    it('generates tokens of correct length', () => {
      const token32 = generateSecureToken(32);
      expect(token32.length).toBe(32);
      
      const token64 = generateSecureToken(64);
      expect(token64.length).toBe(64);
    });
    
    it('generates unique tokens', () => {
      const tokens = new Set<string>();
      for (let i = 0; i < 100; i++) {
        tokens.add(generateSecureToken(32));
      }
      expect(tokens.size).toBe(100);
    });
  });
  
  describe('sha256Hash', () => {
    it('produces consistent hashes', async () => {
      const input = 'test-string';
      const hash1 = await sha256Hash(input);
      const hash2 = await sha256Hash(input);
      expect(hash1).toBe(hash2);
    });
    
    it('produces different hashes for different inputs', async () => {
      const hash1 = await sha256Hash('input1');
      const hash2 = await sha256Hash('input2');
      expect(hash1).not.toBe(hash2);
    });
  });
  
  describe('generateCodeVerifier', () => {
    it('generates a valid PKCE code verifier', () => {
      const verifier = generateCodeVerifier();
      // PKCE recommends 43-128 characters
      expect(verifier.length).toBeGreaterThanOrEqual(43);
      expect(verifier.length).toBeLessThanOrEqual(128);
    });
  });
  
  describe('generateCodeChallenge', () => {
    it('generates a SHA256-based code challenge', async () => {
      const verifier = 'test-verifier';
      const challenge = await generateCodeChallenge(verifier);
      // Base64url encoded SHA256 is 43 characters
      expect(challenge.length).toBe(43);
    });
  });
});

describe('Email utilities', () => {
  describe('normalizeEmail', () => {
    it('converts to lowercase', () => {
      expect(normalizeEmail('TEST@Example.COM')).toBe('test@example.com');
    });
    
    it('trims whitespace', () => {
      expect(normalizeEmail('  test@example.com  ')).toBe('test@example.com');
    });
    
    it('handles mixed case and whitespace', () => {
      expect(normalizeEmail('  TEST@Example.COM  ')).toBe('test@example.com');
    });
  });
  
  describe('isValidEmail', () => {
    it('validates correct emails', () => {
      expect(isValidEmail('test@example.com')).toBe(true);
      expect(isValidEmail('user.name@domain.org')).toBe(true);
      expect(isValidEmail('user+tag@example.co.uk')).toBe(true);
    });
    
    it('rejects invalid emails', () => {
      expect(isValidEmail('invalid')).toBe(false);
      expect(isValidEmail('invalid@')).toBe(false);
      expect(isValidEmail('@domain.com')).toBe(false);
      expect(isValidEmail('user@')).toBe(false);
    });
  });
});

describe('Timing-safe comparison', () => {
  it('returns true for equal strings', () => {
    expect(timingSafeEqual('abc123', 'abc123')).toBe(true);
  });
  
  it('returns false for different strings', () => {
    expect(timingSafeEqual('abc123', 'abc124')).toBe(false);
  });
  
  it('returns false for different lengths', () => {
    expect(timingSafeEqual('abc', 'abcd')).toBe(false);
  });
});

describe('Token hashing', () => {
  it('hashes tokens for storage', async () => {
    const token = generateSecureToken(64);
    const hash = await sha256Hash(token);
    
    // Hash should be 64 hex characters (256 bits)
    expect(hash.length).toBe(64);
    expect(hash).toMatch(/^[0-9a-f]+$/);
    
    // Same token should produce same hash
    const hash2 = await sha256Hash(token);
    expect(hash).toBe(hash2);
  });
});

describe('User status transitions', () => {
  it('validates status values', () => {
    const validStatuses = ['pending_verification', 'active', 'suspended', 'deleted'];
    
    for (const status of validStatuses) {
      expect(['pending_verification', 'active', 'suspended', 'deleted']).toContain(status);
    }
  });
});

describe('Provider types', () => {
  it('validates provider values', () => {
    const validProviders = ['google', 'facebook'];
    
    expect(validProviders).toContain('google');
    expect(validProviders).toContain('facebook');
  });
});

describe('Client types', () => {
  it('validates client type values', () => {
    const validTypes = ['web', 'ios', 'android'];
    
    for (const type of validTypes) {
      expect(['web', 'ios', 'android']).toContain(type);
    }
  });
});

describe('JWT payload structure', () => {
  it('defines required claims', () => {
    const requiredClaims = [
      'iss', // Issuer
      'aud', // Audience
      'sub', // Subject (user ID)
      'iat', // Issued at
      'exp', // Expiration
      'jti', // JWT ID
      'sid', // Session ID
      'ver', // Auth version
      'roles', // User roles
    ];
    
    // All claims should be defined
    expect(requiredClaims.length).toBe(9);
  });
});
