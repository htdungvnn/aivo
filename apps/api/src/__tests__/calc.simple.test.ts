/// <reference types="jest" />
import { describe, it, expect } from '@jest/globals';

describe('Calc Router', () => {
  it('should export CalcRouter function', async () => {
    const { CalcRouter } = await import('../routes/calc');
    expect(CalcRouter).toBeDefined();
    expect(typeof CalcRouter).toBe('function');
  });

  it('should create a router instance', async () => {
    const { CalcRouter } = await import('../routes/calc');
    const router = CalcRouter();
    expect(router).toBeDefined();
    expect(router).toHaveProperty('post');
  });
});
