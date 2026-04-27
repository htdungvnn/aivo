/// <reference types="jest" />
import { describe, it, expect } from '@jest/globals';

describe('Body Router', () => {
  it('should export BodyRouter function', async () => {
    const { BodyRouter } = await import('../routes/body');
    expect(BodyRouter).toBeDefined();
    expect(typeof BodyRouter).toBe('function');
  });

  it('should create a router instance', async () => {
    const { BodyRouter } = await import('../routes/body');
    const router = BodyRouter();
    expect(router).toBeDefined();
    expect(router).toHaveProperty('get');
    expect(router).toHaveProperty('post');
  });
});
