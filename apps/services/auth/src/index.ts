/**
 * Auth Worker - Cloudflare Workers entry point
 */

import { Hono } from 'hono';
import { cors, requestId, errorHandler, rateLimits } from './middleware';
import { createRoutes } from './routes';
import { getJWTService, setJWTService, JWTService } from './lib/jwt';
import { getGoogleProvider, setGoogleProvider, GoogleProvider } from './providers/google';
import { getFacebookProvider, setFacebookProvider, FacebookProvider } from './providers/facebook';
import type { AuthEnv } from './middleware/auth';
import type { EmailVerificationQueueMessage } from '@aivo/queue-types';

export interface Env extends AuthEnv {
  // D1 Database
  DB: D1Database;

  // JWT Configuration
  AUTH_JWT_PRIVATE_KEY?: string;
  AUTH_JWT_PUBLIC_KEY?: string;
  AUTH_JWT_ISSUER?: string;
  AUTH_JWT_AUDIENCE?: string;
  AUTH_JWT_ACCESS_TOKEN_TTL?: string;

  // OAuth Configuration
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  GOOGLE_REDIRECT_URI?: string;
  FACEBOOK_CLIENT_ID?: string;
  FACEBOOK_CLIENT_SECRET?: string;
  FACEBOOK_REDIRECT_URI?: string;

  // App URLs
  WEB_APP_URL?: string;
  MOBILE_REDIRECT_URI?: string;

  // Allowed Origins (comma-separated)
  ALLOWED_ORIGINS?: string;

  // Email Queue for transactional emails
  EMAIL_QUEUE: Queue<EmailVerificationQueueMessage>;
}

// Context Variables for request context
export interface ContextVariables {
  requestId: string;
  user?: {
    id: string;
    email: string;
    status: string;
  };
  session?: {
    id: string;
    userId: string;
  };
  userRoles?: string[];
  authPayload?: {
    sub: string;
    sid: string;
  };
}

export type AppBindings = Env;
export type AppVariables = ContextVariables;

const app = new Hono<{ Bindings: Env; Variables: ContextVariables }>();

// Request ID for all requests
app.use('*', requestId());

// Error handling
app.use('*', errorHandler());

// Get allowed origins from environment
function getAllowedOrigins(env: Env): string[] {
  const origins: string[] = ['http://localhost:3000'];
  
  if (env.ALLOWED_ORIGINS) {
    origins.push(...env.ALLOWED_ORIGINS.split(',').map(s => s.trim()));
  }
  
  if (env.WEB_APP_URL) {
    origins.push(env.WEB_APP_URL);
  }
  
  return [...new Set(origins)];
}

// CORS middleware
app.use('*', async (c, next) => {
  const origin = c.req.header('Origin');
  const allowedOrigins = getAllowedOrigins(c.env);
  
  if (origin && allowedOrigins.some(o => origin === o || o === '*')) {
    c.header('Access-Control-Allow-Origin', origin);
    c.header('Access-Control-Allow-Credentials', 'true');
  }
  
  if (c.req.method === 'OPTIONS') {
    c.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    c.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Request-ID');
    c.header('Access-Control-Max-Age', '86400');
    return c.text('', 200);
  }
  
  await next();
});

// Initialize JWT service
async function initJWTService(env: Env) {
  const jwtService = getJWTService();
  
  if (env.AUTH_JWT_PRIVATE_KEY && env.AUTH_JWT_PUBLIC_KEY) {
    try {
      const service = await (jwtService.constructor as typeof JWTService).fromEnvironment({
        AUTH_JWT_PRIVATE_KEY: env.AUTH_JWT_PRIVATE_KEY,
        AUTH_JWT_PUBLIC_KEY: env.AUTH_JWT_PUBLIC_KEY,
        AUTH_JWT_ISSUER: env.AUTH_JWT_ISSUER,
        AUTH_JWT_AUDIENCE: env.AUTH_JWT_AUDIENCE,
        AUTH_JWT_ACCESS_TOKEN_TTL: env.AUTH_JWT_ACCESS_TOKEN_TTL,
      });
      setJWTService(service);
      console.log('JWT service initialized with keys');
    } catch (error) {
      console.error('Failed to initialize JWT service:', error);
    }
  }
}

// Initialize OAuth providers
function initOAuthProviders(env: Env) {
  // Initialize Google provider
  if (env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET && env.GOOGLE_REDIRECT_URI) {
    const googleProvider = GoogleProvider.fromEnv({
      GOOGLE_CLIENT_ID: env.GOOGLE_CLIENT_ID,
      GOOGLE_CLIENT_SECRET: env.GOOGLE_CLIENT_SECRET,
      GOOGLE_REDIRECT_URI: env.GOOGLE_REDIRECT_URI,
    });
    setGoogleProvider(googleProvider);
    console.log('Google OAuth provider initialized');
  } else {
    console.warn('Google OAuth not configured - set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_REDIRECT_URI');
  }
  
  // Initialize Facebook provider
  if (env.FACEBOOK_CLIENT_ID && env.FACEBOOK_CLIENT_SECRET && env.FACEBOOK_REDIRECT_URI) {
    const facebookProvider = FacebookProvider.fromEnv({
      FACEBOOK_CLIENT_ID: env.FACEBOOK_CLIENT_ID,
      FACEBOOK_CLIENT_SECRET: env.FACEBOOK_CLIENT_SECRET,
      FACEBOOK_REDIRECT_URI: env.FACEBOOK_REDIRECT_URI,
    });
    setFacebookProvider(facebookProvider);
    console.log('Facebook OAuth provider initialized');
  } else {
    console.warn('Facebook OAuth not configured - set FACEBOOK_CLIENT_ID, FACEBOOK_CLIENT_SECRET, and FACEBOOK_REDIRECT_URI');
  }
}

// Health check (no rate limit)
app.get('/health', (c) => {
  return c.json({
    status: 'ok',
    timestamp: Date.now(),
    version: '1.0.0',
  });
});

// Mount routes
const routes = createRoutes();
app.route('/', routes);

// 404 handler
app.notFound((c) => {
  return c.json(
    {
      error: {
        code: 'NOT_FOUND',
        message: 'Endpoint not found',
        requestId: c.get('requestId'),
      },
    },
    404
  );
});

// Export the worker
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    // Initialize JWT service if not already done
    await initJWTService(env);
    
    // Initialize OAuth providers
    initOAuthProviders(env);
    
    // Log request (sanitized)
    const requestId = request.headers.get('X-Request-ID') || crypto.randomUUID();
    console.log(`[${requestId}] ${request.method} ${request.url}`);
    
    return app.fetch(request, env, ctx);
  },
} satisfies ExportedHandler<Env>;
