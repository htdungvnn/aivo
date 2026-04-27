/// <reference types="jest" />
import { describe, it, expect } from '@jest/globals';

describe('Gamification Router', () => {
  it('should export GamificationRouter function', async () => {
    const { GamificationRouter } = await import('../routes/gamification');
    expect(GamificationRouter).toBeDefined();
    expect(typeof GamificationRouter).toBe('function');
  });

  it('should create a router instance', async () => {
    const { GamificationRouter } = await import('../routes/gamification');
    const router = GamificationRouter();
    expect(router).toBeDefined();
    expect(router).toHaveProperty('get');
    expect(router).toHaveProperty('post');
  });
});
