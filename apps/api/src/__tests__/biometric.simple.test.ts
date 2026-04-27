/// <reference types="jest" />
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { Hono } from 'hono';

// Simple test that verifies the router can be imported and has basic structure
describe('Biometric Router', () => {
  it('should export BiometricRouter function', async () => {
    const { BiometricRouter } = await import('../routes/biometric');
    expect(BiometricRouter).toBeDefined();
    expect(typeof BiometricRouter).toBe('function');
  });

  it('should create a router instance', async () => {
    const { BiometricRouter } = await import('../routes/biometric');
    const router = BiometricRouter();
    expect(router).toBeDefined();
    expect(router).toHaveProperty('get');
    expect(router).toHaveProperty('post');
  });
});
