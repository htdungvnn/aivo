/**
 * Mock implementations for common dependencies in AIVO tests
 */

import type { D1Database } from '@cloudflare/workers-types';
import { sql } from 'drizzle-orm';

/**
 * Creates a mock D1 database for testing
 */
export const createMockDb = () => {
  const mockDb = {
    execute: jest.fn(),
    executeSql: jest.fn(),
    batch: jest.fn(),
    query: jest.fn(),
    migrate: jest.fn(),
    raw: jest.fn(),
    _connect: jest.fn(),
    _dispose: jest.fn(),
    drizzle: jest.fn(),
  };

  // Set up default mock implementations
  mockDb.execute.mockResolvedValue({ success: true, data: [] });
  mockDb.executeSql.mockResolvedValue({ success: true, results: [] });
  mockDb.batch.mockResolvedValue({ success: true });

  return mockDb as unknown as D1Database;
};

/**
 * Creates a mock R2 bucket for testing
 */
export const createMockR2 = () => {
  return {
    get: jest.fn().mockResolvedValue({ body: null }),
    put: jest.fn().mockResolvedValue({}),
    delete: jest.fn().mockResolvedValue({}),
    list: jest.fn().mockResolvedValue({ objects: [] }),
    head: jest.fn().mockResolvedValue({}),
  };
};

/**
 * Creates a mock KV namespace for testing
 */
export const createMockKv = () => {
  return {
    get: jest.fn().mockResolvedValue(null),
    put: jest.fn().mockResolvedValue(undefined),
    delete: jest.fn().mockResolvedValue(undefined),
    list: jest.fn().mockResolvedValue({ keys: [], listElement: undefined }),
    getWithMetadata: jest.fn().mockResolvedValue({ value: null, metadata: undefined }),
  };
};

/**
 * Mock for jose library
 */
export const mockJose = () => ({
  jwtVerify: jest.fn(),
  sign: jest.fn(),
  Secret: 'mock-secret',
  decodeJwt: jest.fn(),
});

/**
 * Mock for fetch API
 */
export const mockFetch = (data: any, ok = true) =>
  jest.fn().mockResolvedValue({
    ok,
    json: async () => data,
    status: ok ? 200 : 400,
    text: async () => JSON.stringify(data),
  });

/**
 * Creates a mock AI response
 */
export const createMockAiResponse = (content: string = 'Mock AI response') => ({
  id: 'chatcmpl-' + Math.random().toString(36).substring(2),
  object: 'chat.completion',
  created: Math.floor(Date.now() / 1000),
  model: 'gpt-4o-mini',
  choices: [
    {
      index: 0,
      message: {
        role: 'assistant' as const,
        content,
      },
      finish_reason: 'stop',
    },
  ],
  usage: {
    prompt_tokens: 100,
    completion_tokens: 50,
    total_tokens: 150,
  },
});

/**
 * Mock for OpenAI API
 */
export const createMockOpenAI = () => ({
  chat: {
    completions: {
      create: jest.fn(),
    },
  },
});

/**
 * Mock for Google Generative AI
 */
export const mockGoogleGenerativeAI = () => ({
  getGenerativeModel: jest.fn().mockReturnValue({
    generateContent: jest.fn().mockResolvedValue({
      response: {
        candidates: [
          {
            content: {
              parts: [{ text: 'Mock Gemini response' }],
            },
          },
        ],
      },
    }),
  }),
});

/**
 * Helper to set up common mocks for API tests
 */
export const setupApiMocks = () => {
  const jose = mockJose();
  const db = createMockDb();
  const r2 = createMockR2();
  const kv = createMockKv();

  return { jose, db, r2, kv };
};

/**
 * Helper to mock environment variables
 */
export const mockEnv = (env: Record<string, string> = {}) => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv, ...env };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  return process.env;
};
