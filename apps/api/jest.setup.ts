// Set vi to jest global for compatibility
(global as any).vi = jest;

// Mock environment variables for testing
process.env.AUTH_SECRET = 'test-secret-key-for-ci';
