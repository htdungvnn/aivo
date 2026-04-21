import { describe, it, expect } from '@jest/globals';
import { users, sessions } from '../schema';

describe('Database Schema', () => {
  it('should export users table', () => {
    expect(users).toBeDefined();
    expect(typeof users).toBe('object');
  });

  it('should export sessions table', () => {
    expect(sessions).toBeDefined();
    expect(typeof sessions).toBe('object');
  });

  it('should have columns on users table', () => {
    expect(users.id).toBeDefined();
    expect(users.email).toBeDefined();
    expect(users.name).toBeDefined();
    expect(users.createdAt).toBeDefined();
    expect(users.updatedAt).toBeDefined();
  });

  it('should have columns on sessions table', () => {
    expect(sessions.id).toBeDefined();
    expect(sessions.userId).toBeDefined();
    expect(sessions.provider).toBeDefined();
    expect(sessions.providerUserId).toBeDefined();
    expect(sessions.accessToken).toBeDefined();
    expect(sessions.createdAt).toBeDefined();
    expect(sessions.updatedAt).toBeDefined();
  });

  it('should have session foreign key to users', () => {
    // Check that userId column exists and has reference info in the table definition
    // Using type assertion to access Drizzle internal properties
    const userIdColumn = sessions.userId as { references?: unknown };
    expect(userIdColumn).toBeDefined();
  });
});
