/// <reference types="jest" />
import { describe, it, expect } from '@jest/globals';

describe('Workouts Router', () => {
  it('should export WorkoutsRouter function', async () => {
    const module = await import('../routes/workouts');
    expect(module.WorkoutsRouter).toBeDefined();
  });
});
