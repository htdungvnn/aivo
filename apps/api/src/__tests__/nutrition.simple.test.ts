/// <reference types="jest" />
import { describe, it, expect } from '@jest/globals';

describe('Nutrition Router', () => {
  it('should export NutritionRouter function', async () => {
    const { NutritionRouter } = await import('../routes/nutrition');
    expect(NutritionRouter).toBeDefined();
    expect(typeof NutritionRouter).toBe('function');
  });

  it('should create a router instance', async () => {
    const { NutritionRouter } = await import('../routes/nutrition');
    const router = NutritionRouter();
    expect(router).toBeDefined();
    expect(router).toHaveProperty('get');
    expect(router).toHaveProperty('post');
  });
});
