/**
 * CORS Middleware
 * 
 * Configurable CORS handling with origin allowlist.
 * Follows Single Responsibility: only handles CORS.
 */

// =============================================================================
// Types
// =============================================================================

/**
 * CORS configuration
 */
export interface CORSConfig {
  /** Allowed origins (array or function for dynamic checking) */
  origins: string[] | CORSOriginValidator;
  /** Allowed HTTP methods */
  methods?: string[];
  /** Allowed request headers */
  headers?: string[];
  /** Exposed response headers */
  exposedHeaders?: string[];
  /** Allow credentials */
  credentials?: boolean;
  /** Preflight cache duration (seconds) */
  maxAge?: number;
}

/**
 * Function to validate and get allowed origin
 */
export type CORSOriginValidator = (
  origin: string | null,
  request: Request
) => string | null;

/**
 * Default CORS configuration
 */
export const DEFAULT_CORS_CONFIG: Required<CORSConfig> = {
  origins: ['http://localhost:3000', 'https://aivo.app', 'https://www.aivo.app'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  headers: ['Content-Type', 'Authorization', 'X-Request-ID', 'X-API-Key'],
  exposedHeaders: ['X-RateLimit-*'],
  credentials: true,
  maxAge: 86400,
};

// =============================================================================
// Utilities
// =============================================================================

/**
 * Parse allowed origins from environment variable
 */
export function parseOriginsFromEnv(
  envOrigins: string | undefined,
  defaults: string[] = []
): string[] {
  if (!envOrigins) {
    return defaults;
  }
  
  const origins = envOrigins
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  
  return [...new Set([...defaults, ...origins])];
}

/**
 * Create origin validator from origins array
 */
export function createOriginValidator(
  origins: string[]
): CORSOriginValidator {
  // Create Set for O(1) lookup
  const originSet = new Set(origins);
  
  return (origin: string | null, _request: Request): string | null => {
    if (!origin) return null;
    
    // Check exact match
    if (originSet.has(origin)) {
      return origin;
    }
    
    // Check wildcard
    if (originSet.has('*')) {
      return origin;
    }
    
    // Check subdomain wildcards (e.g., *.aivo.app)
    try {
      const originUrl = new URL(origin);
      for (const allowed of origins) {
        if (allowed.startsWith('*.')) {
          const domain = allowed.slice(2);
          if (
            originUrl.hostname === domain ||
            originUrl.hostname.endsWith(`.${domain}`)
          ) {
            return origin;
          }
        }
      }
    } catch {
      // Invalid origin URL
    }
    
    return null;
  };
}

/**
 * Create CORS config from environment
 */
export function createCORSConfigFromEnv(
  env: Record<string, string | undefined>,
  defaults: string[] = ['http://localhost:3000']
): CORSConfig {
  const origins = parseOriginsFromEnv(env.ALLOWED_ORIGINS, defaults);
  
  return {
    origins,
    methods: env.CORS_METHODS?.split(',').map((s) => s.trim()) || undefined,
    headers: env.CORS_HEADERS?.split(',').map((s) => s.trim()) || undefined,
    credentials: env.CORS_CREDENTIALS !== 'false',
    maxAge: env.CORS_MAX_AGE ? parseInt(env.CORS_MAX_AGE, 10) : undefined,
  };
}

/**
 * Get Access-Control-Allow-Methods header value
 */
export function getAllowMethods(methods: string[]): string {
  return methods.join(', ');
}

/**
 * Get Access-Control-Allow-Headers header value
 */
export function getAllowHeaders(headers: string[]): string {
  return headers.join(', ');
}

// =============================================================================
// Factory
// =============================================================================

/**
 * Create a CORS validator function
 */
export function createCORSValidator(config: CORSConfig): {
  validateOrigin: CORSOriginValidator;
  getHeaders: (request: Request) => Record<string, string>;
} {
  const mergedConfig = { ...DEFAULT_CORS_CONFIG, ...config };
  
  // Resolve origins to validator function
  const validateOrigin: CORSOriginValidator =
    typeof mergedConfig.origins === 'function'
      ? mergedConfig.origins
      : createOriginValidator(mergedConfig.origins);
  
  // Create headers getter
  const getHeaders = (request: Request): Record<string, string> => {
    const origin = request.headers.get('Origin');
    const allowedOrigin = validateOrigin(origin, request);
    
    const headers: Record<string, string> = {};
    
    if (allowedOrigin) {
      headers['Access-Control-Allow-Origin'] = allowedOrigin;
      
      if (mergedConfig.credentials) {
        headers['Access-Control-Allow-Credentials'] = 'true';
      }
      
      if (mergedConfig.exposedHeaders?.length) {
        headers['Access-Control-Expose-Headers'] = getAllowHeaders(mergedConfig.exposedHeaders);
      }
    }
    
    return headers;
  };
  
  return { validateOrigin, getHeaders };
}
