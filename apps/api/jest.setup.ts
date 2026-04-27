// Set vi to jest global for compatibility
(global as any).vi = jest;

// Mock environment variables for testing
process.env.AUTH_SECRET = 'test-secret-key-for-ci';
process.env.OPENAI_API_KEY = 'sk-test-dummy-openai-api-key';
process.env.GEMINI_API_KEY = 'dummy-gemini-key';
process.env.GOOGLE_CLIENT_ID = 'dummy-google-client-id';
process.env.FACEBOOK_APP_ID = 'dummy-facebook-app-id';
process.env.ALLOWED_ORIGINS = 'http://localhost:3000';
process.env.R2_PUBLIC_URL = 'https://dummy.r2.url';
