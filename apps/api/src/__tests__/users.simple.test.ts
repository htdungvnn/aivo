/// <reference types="jest" />
import { describe, it, expect } from '@jest/globals';

describe('Users Router', () => {
  it('should export UsersRouter function', async () => {
    const { UsersRouter } = await import('../routes/users');
    expect(UsersRouter).toBeDefined();
    expect(typeof UsersRouter).toBe('function');
  });

  it('should create a router instance', async () => {
    const { UsersRouter } = await import('../routes/users');
    const router = UsersRouter();
    expect(router).toBeDefined();
    expect(router).toHaveProperty('get');
    expect(router).toHaveProperty('post');
  });
});
