/// <reference types="jest" />
import { describe, it, expect } from '@jest/globals';

describe('Users Router', () => {
  it('should export UsersRouter function', async () => {
    const module = await import('../routes/users');
    expect(module.UsersRouter || module.default).toBeDefined();
  });
});
