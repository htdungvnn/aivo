/// <reference types="jest" />
import { describe, it, expect } from '@jest/globals';

describe('Health Router', () => {
  it('should export HealthRouter function', async () => {
    const { HealthRouter } = await import('../routes/health');
    expect(HealthRouter).toBeDefined();
    expect(typeof HealthRouter).toBe('function');
  });

  it('should create a router instance', async () => {
    const { HealthRouter } = await import('../routes/health');
    const router = HealthRouter();
    expect(router).toBeDefined();
    expect(router).toHaveProperty('get');
    expect(router).toHaveProperty('post');
  });
});
