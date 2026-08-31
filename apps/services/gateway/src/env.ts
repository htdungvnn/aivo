/**
 * Gateway Environment Types
 * Environment variables and bindings for the API Gateway
 */

export interface GatewayEnv {
  // Service URLs (internal networking in production)
  AUTH_SERVICE_URL: string;
  HEALTH_SERVICE_URL: string;
  COACH_SERVICE_URL: string;
  NUTRITION_SERVICE_URL: string;
  MAIL_SERVICE_URL: string;
  
  // CORS
  ALLOWED_ORIGINS: string;
  
  // Rate Limiting
  RATE_LIMIT_MAX: string;
  RATE_LIMIT_WINDOW_MS: string;
  
  // Feature Flags
  ENABLE_SWAGGER: string;
  ENABLE_METRICS: string;
  
  // Security
  API_KEY: string;
  
  // KV for distributed rate limiting (optional)
  RATE_LIMIT_KV?: KVNamespace;
  
  // Analytics (optional)
  ANALYTICS_KV?: KVNamespace;
  
  // Assets binding for static files
  ASSETS?: { fetch: (req: Request) => Promise<Response> };
}

// =============================================================================
// Configuration
// =============================================================================

export interface GatewayConfig {
  services: {
    auth: { url: string; timeout: number };
    health: { url: string; timeout: number };
    coach: { url: string; timeout: number };
    nutrition: { url: string; timeout: number };
    mail: { url: string; timeout: number };
  };
  cors: {
    origins: string[];
    credentials: boolean;
    maxAge: number;
  };
  rateLimit: {
    max: number;
    windowMs: number;
    useKV: boolean;
  };
  security: {
    requireApiKey: boolean;
    enableIpFiltering: boolean;
  };
  features: {
    swagger: boolean;
    metrics: boolean;
    tracing: boolean;
  };
}

// =============================================================================
// Service Configuration
// =============================================================================

export const DEFAULT_CONFIG: GatewayConfig = {
  services: {
    auth: { url: 'http://localhost:3001', timeout: 30000 },
    health: { url: 'http://localhost:3002', timeout: 30000 },
    coach: { url: 'http://localhost:3003', timeout: 30000 },
    nutrition: { url: 'http://localhost:3004', timeout: 30000 },
    mail: { url: 'http://localhost:3005', timeout: 30000 },
  },
  cors: {
    origins: [
      'http://localhost:3000',
      'https://aivo.app',
      'https://www.aivo.app',
    ],
    credentials: true,
    maxAge: 86400,
  },
  rateLimit: {
    max: 100,
    windowMs: 60000,
    useKV: false,
  },
  security: {
    requireApiKey: false,
    enableIpFiltering: false,
  },
  features: {
    swagger: true,
    metrics: true,
    tracing: true,
  },
};

// =============================================================================
// Validation
// =============================================================================

export function validateEnv(env: GatewayEnv): void {
  const required: (keyof GatewayEnv)[] = [];
  
  // Only validate required if not in development
  const isProduction = env.ALLOWED_ORIGINS?.includes('https://aivo.app');
  
  if (isProduction) {
    if (!env.AUTH_SERVICE_URL) required.push('AUTH_SERVICE_URL');
    if (!env.HEALTH_SERVICE_URL) required.push('HEALTH_SERVICE_URL');
    if (!env.COACH_SERVICE_URL) required.push('COACH_SERVICE_URL');
    if (!env.NUTRITION_SERVICE_URL) required.push('NUTRITION_SERVICE_URL');
    if (!env.MAIL_SERVICE_URL) required.push('MAIL_SERVICE_URL');
  }
  
  if (required.length > 0) {
    throw new Error(`Missing required environment variables: ${required.join(', ')}`);
  }
}
