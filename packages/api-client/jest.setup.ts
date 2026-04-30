// Jest setup for api-client tests
import '@testing-library/jest-dom';

// Mock fetch globally if not already available
if (!global.fetch) {
  global.fetch = jest.fn();
}