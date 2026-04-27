/// <reference types="jest" />
import { describe, it, expect } from '@jest/globals';

describe('Workouts Router', () => {
  it('should export WorkoutsRouter function', async () => {
    const { WorkoutsRouter } = await import('../routes/workouts');
    expect(WorkoutsRouter).toBeDefined();
    expect(typeof WorkoutsRouter).toBe('function');
  });

  it('should create a router instance', async () => {
    const { WorkoutsRouter } = await import('../routes/workouts');
    const router = WorkoutsRouter();
    expect(router).toBeDefined();
    expect(router).toHaveProperty('get');
    expect(router).toHaveProperty('post');
  });
});
