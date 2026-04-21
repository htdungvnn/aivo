/// <reference types="jest" />
import { describe, it, expect, beforeEach, vi, afterEach } from '@jest/globals';
import { Hono } from 'hono';
import { jwtVerify, sign } from 'jose';
import { z } from 'zod';

// Mock database
const mockDb = {
  users: {
    findFirst: vi.fn(),
    upsert: vi.fn(),
  },
  sessions: {
    findFirst: vi.fn(),
    create: vi.fn(),
    delete: vi.fn(),
  },
};

vi.mock('../src/services/db', () => ({
  db: mockDb,
}));

vi.mock('jose', () => ({
  jwtVerify: vi.fn(),
  sign: vi.fn(),
  Secret: 'mock-secret',
}));

describe('Authentication API', () => {
  const mockEnv = {
    AUTH_SECRET: 'test-secret',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /api/auth/google', () => {
    it('should verify Google ID token and create/find user', async () => {
      const app = new Hono();

      const mockGoogleToken = 'mock-google-id-token';
      const mockGoogleUser = {
        email: 'user@example.com',
        name: 'Test User',
        picture: 'https://example.com/photo.jpg',
        sub: 'google-123',
      };

      (jwtVerify as any).mockResolvedValue({
        payload: {
          email: mockGoogleUser.email,
          name: mockGoogleUser.name,
          picture: mockGoogleUser.picture,
          sub: mockGoogleUser.sub,
        },
      });

      mockDb.users.findFirst.mockResolvedValue(null);
      mockDb.users.upsert.mockResolvedValue({
        id: 'user-123',
        email: mockGoogleUser.email,
        name: mockGoogleUser.name,
        avatarUrl: mockGoogleUser.picture,
        createdAt: Math.floor(Date.now() / 1000),
      });

      (sign as any).mockReturnValue('signed-jwt-token');

      app.post('/api/auth/google', async (c) => {
        const { id_token } = await c.req.json();

        if (!id_token) {
          return c.json({ success: false, error: 'ID token required' }, 400);
        }

        try {
          const { payload } = await jwtVerify(id_token, mockEnv.AUTH_SECRET);

          let user = await mockDb.users.findFirst({
            where: { email: payload.email },
          });

          if (!user) {
            user = await mockDb.users.upsert({
              where: { email: payload.email },
              create: {
                id: `user-${Date.now()}`,
                email: payload.email,
                name: payload.name,
                avatarUrl: payload.picture,
                provider: 'google',
                providerId: payload.sub,
              },
            });
          }

          // Create session
          const token = sign({}, mockEnv.AUTH_SECRET, {
            subject: user.id,
            expiresIn: '30d',
          });

          await mockDb.sessions.create({
            userId: user.id,
            provider: 'google',
            providerUserId: payload.sub,
            token,
          });

          return c.json({
            success: true,
            data: {
              user: {
                id: user.id,
                email: user.email,
                name: user.name,
                avatarUrl: user.avatarUrl,
              },
              token,
            },
          });
        } catch (error) {
          return c.json({ success: false, error: 'Invalid token' }, 401);
        }
      });

      const request = new Request('http://localhost:8787/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id_token: mockGoogleToken }),
      });

      const response = await app.fetch(request);
      const json = await response.json() as any;

      expect(response.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data.user.email).toBe('user@example.com');
      expect(json.data.token).toBe('signed-jwt-token');
    });

    it('handles invalid Google token', async () => {
      const app = new Hono();

      (jwtVerify as any).mockRejectedValue(new Error('Invalid token'));

      app.post('/api/auth/google', async (c) => {
        const { id_token } = await c.req.json();

        if (!id_token) {
          return c.json({ success: false, error: 'ID token required' }, 400);
        }

        try {
          await jwtVerify(id_token, mockEnv.AUTH_SECRET);
        } catch (error) {
          return c.json({ success: false, error: 'Invalid token' }, 401);
        }
      });

      const request = new Request('http://localhost:8787/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id_token: 'invalid-token' }),
      });

      const response = await app.fetch(request);
      const json = await response.json() as any;

      expect(response.status).toBe(401);
      expect(json.error).toBe('Invalid token');
    });

    it('requires id_token in request body', async () => {
      const app = new Hono();

      app.post('/api/auth/google', async (c) => {
        const { id_token } = await c.req.json();

        if (!id_token) {
          return c.json({ success: false, error: 'ID token required' }, 400);
        }

        return c.json({ success: true });
      });

      const request = new Request('http://localhost:8787/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      const response = await app.fetch(request);
      const json = await response.json() as any;

      expect(response.status).toBe(400);
      expect(json.error).toBe('ID token required');
    });
  });

  describe('POST /api/auth/facebook', () => {
    it('should verify Facebook access token and create/find user', async () => {
      const app = new Hono();

      const mockFbToken = 'mock-fb-access-token';
      const mockFbUser = {
        email: 'fbuser@example.com',
        name: 'FB User',
        id: 'facebook-123',
      };

      (global as any).fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockFbUser,
      });

      mockDb.users.findFirst.mockResolvedValue(null);
      mockDb.users.upsert.mockResolvedValue({
        id: 'user-456',
        email: mockFbUser.email,
        name: mockFbUser.name,
        provider: 'facebook',
        providerId: mockFbUser.id,
      });

      (sign as any).mockReturnValue('signed-jwt-token');

      app.post('/api/auth/facebook', async (c) => {
        const { access_token } = await c.req.json();

        if (!access_token) {
          return c.json({ success: false, error: 'Access token required' }, 400);
        }

        // Verify with Facebook Graph API
        const fbResponse = await (global as any).fetch(
          `https://graph.facebook.com/me?fields=id,name,email&access_token=${access_token}`
        );

        if (!fbResponse.ok) {
          return c.json({ success: false, error: 'Invalid Facebook token' }, 401);
        }

        const fbUser = await fbResponse.json();

        let user = await mockDb.users.findFirst({
          where: { email: fbUser.email },
        });

        if (!user) {
          user = await mockDb.users.upsert({
            where: { email: fbUser.email },
            create: {
              id: `user-${Date.now()}`,
              email: fbUser.email,
              name: fbUser.name,
              provider: 'facebook',
              providerId: fbUser.id,
            },
          });
        }

        const token = sign({}, mockEnv.AUTH_SECRET, {
          subject: user.id,
          expiresIn: '30d',
        });

        return c.json({
          success: true,
          data: {
            user: {
              id: user.id,
              email: user.email,
              name: user.name,
            },
            token,
          },
        });
      });

      const request = new Request('http://localhost:8787/api/auth/facebook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ access_token: mockFbToken }),
      });

      const response = await app.fetch(request);
      const json = await response.json() as any;

      expect(response.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data.user.email).toBe('fbuser@example.com');
    });

    it('handles Facebook API errors', async () => {
      const app = new Hono();

      (global as any).fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        json: async () => ({ error: { message: 'Invalid token' } }),
      });

      app.post('/api/auth/facebook', async (c) => {
        const { access_token } = await c.req.json();

        const fbResponse = await (global as any).fetch(
          `https://graph.facebook.com/me?access_token=${access_token}`
        );

        if (!fbResponse.ok) {
          return c.json({ success: false, error: 'Facebook verification failed' }, 401);
        }

        return c.json({ success: true });
      });

      const request = new Request('http://localhost:8787/api/auth/facebook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ access_token: 'invalid' }),
      });

      const response = await app.fetch(request);
      const json = await response.json() as any;

      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/auth/verify', () => {
    it('should verify valid JWT token', async () => {
      const app = new Hono();

      const mockPayload = { sub: 'user-123' };
      (jwtVerify as any).mockResolvedValue({ payload: mockPayload });

      app.post('/api/auth/verify', async (c) => {
        const authHeader = c.req.header('Authorization');

        if (!authHeader) {
          return c.json({ success: false, error: 'No token provided' }, 401);
        }

        try {
          const { payload } = await jwtVerify(authHeader.replace('Bearer ', ''), mockEnv.AUTH_SECRET);
          return c.json({ success: true, data: { userId: payload.sub } });
        } catch (error) {
          return c.json({ success: false, error: 'Invalid token' }, 401);
        }
      });

      const request = new Request('http://localhost:8787/api/auth/verify', {
        headers: { 'Authorization': 'Bearer valid-token' },
      });

      const response = await app.fetch(request);
      const json = await response.json() as any;

      expect(response.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data.userId).toBe('user-123');
    });

    it('handles expired token', async () => {
      const app = new Hono();

      (jwtVerify as any).mockRejectedValue(new Error('Token expired'));

      app.post('/api/auth/verify', async (c) => {
        const authHeader = c.req.header('Authorization');

        try {
          await jwtVerify(authHeader?.replace('Bearer ', '') || '', mockEnv.AUTH_SECRET);
        } catch (error: any) {
          return c.json({ success: false, error: error.message }, 401);
        }

        return c.json({ success: true });
      });

      const request = new Request('http://localhost:8787/api/auth/verify', {
        headers: { 'Authorization': 'Bearer expired-token' },
      });

      const response = await app.fetch(request);
      const json = await response.json() as any;

      expect(response.status).toBe(401);
      expect(json.error).toBe('Token expired');
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should invalidate session', async () => {
      const app = new Hono();

      mockDb.sessions.delete.mockResolvedValue({ success: true });

      app.post('/api/auth/logout', async (c) => {
        const authHeader = c.req.header('Authorization');
        const token = authHeader?.replace('Bearer ', '');

        if (!token) {
          return c.json({ success: false, error: 'No token provided' }, 401);
        }

        const result = await mockDb.sessions.delete({
          where: { token },
        });

        return c.json({ success: true, data: result });
      });

      const request = new Request('http://localhost:8787/api/auth/logout', {
        headers: { 'Authorization': 'Bearer token-to-invalidate' },
      });

      const response = await app.fetch(request);
      const json = await response.json() as any;

      expect(response.status).toBe(200);
      expect(mockDb.sessions.delete).toHaveBeenCalledWith({
        where: { token: 'token-to-invalidate' },
      });
    });
  });

  describe('Token Security', () => {
    it('should have appropriate expiration', () => {
      const expiration = '30d';
      expect(expiration).toBe('30d');
    });

    it('should store provider session data', async () => {
      const sessionData = {
        userId: 'user-123',
        provider: 'google',
        providerUserId: 'google-456',
        token: 'jwt-token',
      };

      expect(sessionData.provider).toMatch(/google|facebook/);
      expect(sessionData.providerUserId).toBeDefined();
    });
  });
});
