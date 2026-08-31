/**
 * Gateway Environment Types
 * 
 * Environment variables and Cloudflare bindings for the API Gateway.
 * Uses Cloudflare Service Bindings for internal networking between Workers.
 */

export interface GatewayEnv {
  // Cloudflare Service Bindings (internal networking - no external calls)
  // These are configured in wrangler.jsonc under "services"
  AUTH_SERVICE: Fetcher;
  HEALTH_SERVICE: Fetcher;
  COACH_SERVICE: Fetcher;
  NUTRITION_SERVICE: Fetcher;
  MAIL_SERVICE: Fetcher;
  
  // Legacy environment variables (still supported for local dev)
  // In production, use service bindings instead
  AUTH_SERVICE_URL?: string;
  HEALTH_SERVICE_URL?: string;
  COACH_SERVICE_URL?: string;
  NUTRITION_SERVICE_URL?: string;
  MAIL_SERVICE_URL?: string;
  
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
  
  // KV for distributed rate limiting
  RATE_LIMIT_KV?: KVNamespace;
  
  // KV for analytics
  ANALYTICS_KV?: KVNamespace;
  
  // Assets binding for static files
  ASSETS?: { fetch: (req: Request) => Promise<Response> };
}

// =============================================================================
// Service Names (for service binding keys)
// =============================================================================

export const SERVICE_BINDINGS = {
  AUTH: 'AUTH_SERVICE',
  HEALTH: 'HEALTH_SERVICE',
  COACH: 'COACH_SERVICE',
  NUTRITION: 'NUTRITION_SERVICE',
  MAIL: 'MAIL_SERVICE',
} as const;

export type ServiceName = keyof typeof SERVICE_BINDINGS;

// =============================================================================
// Configuration
// =============================================================================

export interface GatewayConfig {
  services: {
    auth: { timeout: number };
    health: { timeout: number };
    coach: { timeout: number };
    nutrition: { timeout: number };
    mail: { timeout: number };
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
// Default Configuration
// =============================================================================

export const DEFAULT_CONFIG: GatewayConfig = {
  services: {
    auth: { timeout: 30000 },
    health: { timeout: 30000 },
    coach: { timeout: 30000 },
    nutrition: { timeout: 30000 },
    mail: { timeout: 30000 },
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
// Service Binding Types
// =============================================================================

/**
 * Get the service binding name for a service
 */
export function getServiceBinding(service: ServiceName): string {
  return SERVICE_BINDINGS[service];
}

/**
 * Get the service path prefix for routing
 */
export const SERVICE_PATHS: Record<ServiceName, string> = {
  AUTH: '/api/v1/auth',
  HEALTH: '/api/v1/health',
  COACH: '/api/v1/coach',
  NUTRITION: '/api/v1/nutrition',
  MAIL: '/api/v1/mail',
};
