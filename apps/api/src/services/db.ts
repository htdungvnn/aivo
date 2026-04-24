/**
 * Database Service - Minimal stub for testing
 * The actual implementation uses Drizzle ORM with Cloudflare D1
 */

export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  provider: 'google' | 'facebook';
  providerId: string;
  createdAt: number;
}

export interface Session {
  id: string;
  userId: string;
  provider: string;
  providerUserId: string;
  token: string;
  createdAt: number;
}

// Minimal db interface for tests
export const db = {
  users: {
    findFirst: async () => null,
    upsert: async () => ({ id: 'user-123' }),
  },
  sessions: {
    findFirst: async () => null,
    create: async () => ({ success: true }),
    delete: async () => ({ success: true }),
  },
};

// Helper to run raw queries (stub)
export const raw = (_query: string, _params: unknown[]) => ({
  execute: async () => ({ success: true, changes: 0 }),
  query: async () => ({ success: true, results: [] }),
});
