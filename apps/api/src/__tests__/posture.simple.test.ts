/// <reference types="jest" />
import { describe, it, expect } from '@jest/globals';

describe('Posture Router', () => {
  it('should export PostureRouter function', async () => {
    const { PostureRouter } = await import('../routes/posture');
    expect(PostureRouter).toBeDefined();
    expect(typeof PostureRouter).toBe('function');
  });

  it('should create a router instance', async () => {
    const { PostureRouter } = await import('../routes/posture');
    const router = PostureRouter();
    expect(router).toBeDefined();
    expect(router).toHaveProperty('get');
    expect(router).toHaveProperty('post');
  });
});
