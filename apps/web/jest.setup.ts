import '@testing-library/jest-dom';

// Mock ResizeObserver which is required by Recharts
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Alias vi to jest for Vitest compatibility
(global as typeof globalThis & { vi: unknown }).vi = global.jest;

// Note: Recharts mock disabled for debugging
// jest.mock('recharts', () => { ... });
