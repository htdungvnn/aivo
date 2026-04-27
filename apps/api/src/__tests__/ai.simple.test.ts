/// <reference types="jest" />
import { describe, it, expect } from '@jest/globals';

describe('AI Router', () => {
  it('should export AIRouter function', async () => {
    const { AIRouter } = await import('../routes/ai');
    expect(AIRouter).toBeDefined();
    expect(typeof AIRouter).toBe('function');
  });

  it('should create a router instance', async () => {
    const { AIRouter } = await import('../routes/ai');
    const router = AIRouter();
    expect(router).toBeDefined();
    expect(router).toHaveProperty('get');
    expect(router).toHaveProperty('post');
  });
});
