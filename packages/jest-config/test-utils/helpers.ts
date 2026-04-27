/**
 * Test helper functions for AIVO tests
 */

import type { Request, Response } from 'hono';
import { Context } from 'hono';

/**
 * Creates a mock Hono context for testing
 */
export const createMockContext = (req?: Request, env?: any): Context<any> => {
  const defaultReq = req ?? new Request('http://localhost/');
  const defaultEnv = env ?? {};

  return {
    req: defaultReq as any,
    env: defaultEnv,
    var: () => ({}),
    header: jest.fn().mockReturnValue(undefined),
    set: jest.fn(),
    json: jest.fn().mockResolvedValue(undefined),
    text: jest.fn().mockResolvedValue(undefined),
    html: jest.fn().mockResolvedValue(undefined),
    redirect: jest.fn().mockResolvedValue(undefined),
    status: jest.fn().mockReturnValue(undefined),
    unreachable: jest.fn().mockImplementation(() => {
      throw new Error('Function unreachable');
    }),
    fatal: jest.fn().mockImplementation(() => {
      throw new Error('Function fatal');
    }),
    proxy: jest.fn(),
  } as any;
};

/**
 * Creates a mock Request for testing
 */
export const createMockRequest = (
  url: string = 'http://localhost/',
  options: {
    method?: string;
    headers?: Record<string, string>;
    body?: any;
  } = {}
): Request => {
  const { method = 'GET', headers = {}, body } = options;

  const requestInit: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  };

  if (body !== undefined) {
    requestInit.body = JSON.stringify(body);
  }

  return new Request(url, requestInit);
};

/**
 * Asserts that a response has expected status and shape
 */
export const assertResponse = async <T>(
  response: Response,
  expectedStatus: number = 200,
  expectedShape?: Partial<T>
): Promise<T> => {
  expect(response.status).toBe(expectedStatus);

  const contentType = response.headers.get('Content-Type');
  if (!contentType?.includes('application/json')) {
    throw new Error('Response is not JSON');
  }

  const data = (await response.json()) as T;

  if (expectedShape) {
    Object.entries(expectedShape).forEach(([key, value]) => {
      if (value !== undefined) {
        expect(data).toHaveProperty(key);
        expect(data[key]).toEqual(value);
      }
    });
  }

  return data;
};

/**
 * Asserts that a response indicates an error
 */
export const assertErrorResponse = async (
  response: Response,
  expectedStatus: number,
  expectedError?: string
): Promise<any> => {
  expect(response.status).toBe(expectedStatus);

  const data = await response.json();
  expect(data).toHaveProperty('success');
  expect(data.success).toBe(false);
  expect(data).toHaveProperty('error');

  if (expectedError) {
    expect(data.error).toBe(expectedError);
  }

  return data;
};

/**
 * Sleep utility for tests
 */
export const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Generates a random string of given length
 */
export const randomString = (length: number = 10) =>
  Math.random().toString(36).substring(2, 2 + length);

/**
 * Creates a partial mock of an object with jest.fn() for all methods
 */
export const createPartialMock = <T extends object>(obj: T, overrides?: Partial<Record<keyof T, any>>): T => {
  const mock: any = {};

  Object.keys(obj).forEach(key => {
    const keyStr = key as string;
    if (typeof obj[keyStr] === 'function') {
      mock[keyStr] = jest.fn().mockImplementation((obj[keyStr] as any));
    } else {
      mock[keyStr] = obj[keyStr];
    }
  });

  if (overrides) {
    Object.assign(mock, overrides);
  }

  return mock as T;
};
