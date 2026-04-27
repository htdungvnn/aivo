/// <reference types="jest" />
import { describe, it, expect } from '@jest/globals';

describe('Form Analyze Router', () => {
  it('should export FormAnalyzeRouter function', async () => {
    const { FormAnalyzeRouter } = await import('../routes/form-analyze');
    expect(FormAnalyzeRouter).toBeDefined();
    expect(typeof FormAnalyzeRouter).toBe('function');
  });

  it('should create a router instance', async () => {
    const { FormAnalyzeRouter } = await import('../routes/form-analyze');
    const router = FormAnalyzeRouter();
    expect(router).toBeDefined();
    expect(router).toHaveProperty('get');
    expect(router).toHaveProperty('post');
  });
});
