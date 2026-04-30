import { describe, it, expect, beforeEach } from '@jest/globals';
import { db, raw } from '../services/db';

describe('Database Service', () => {
  beforeEach(() => {
    // Reset mocks if they exist
  });

  describe('db.users', () => {
    it('findFirst returns null by default', async () => {
      const result = await db.users.findFirst();
      expect(result).toBeNull();
    });

    it('upsert returns a user object with id', async () => {
      const result = await db.users.upsert({} as any);
      expect(result).toEqual({ id: 'user-123' });
    });
  });

  describe('db.sessions', () => {
    it('findFirst returns null by default', async () => {
      const result = await db.sessions.findFirst();
      expect(result).toBeNull();
    });

    it('create returns success', async () => {
      const result = await db.sessions.create({} as any);
      expect(result).toEqual({ success: true });
    });

    it('delete returns success', async () => {
      const result = await db.sessions.delete({} as any);
      expect(result).toEqual({ success: true });
    });
  });

  describe('raw queries', () => {
    it('execute returns success and changes', async () => {
      const result = await raw('SELECT 1', []).execute();
      expect(result).toEqual({ success: true, changes: 0 });
    });

    it('query returns success and results', async () => {
      const result = await raw('SELECT * FROM users', []).query();
      expect(result).toEqual({ success: true, results: [] });
    });

    it('accepts query parameters', async () => {
      const result = await raw('SELECT * FROM users WHERE id = ?', ['123']).query();
      expect(result.success).toBe(true);
    });
  });
});
