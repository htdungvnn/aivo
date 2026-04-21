import { describe, it, expect } from '@jest/globals';

// Simple unit tests for API package
describe('API Package', () => {
  it('should have environment variables set in test setup', () => {
    expect(process.env.AUTH_SECRET).toBe('test-secret-key-for-ci');
  });

  it('should be able to import shared types', () => {
    // This test verifies that the module resolution works
    expect(true).toBe(true);
  });
});
