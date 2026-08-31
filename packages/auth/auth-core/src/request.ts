/**
 * Request Utilities
 * 
 * Helper functions for extracting information from HTTP requests.
 */

import type { ClientType } from './types/index.js';

// =============================================================================
// Token Extraction
// =============================================================================

/**
 * Extract bearer token from Authorization header
 */
export function extractBearerToken(request: Request): string | null {
  const authHeader = request.headers.get('Authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }
  return null;
}

/**
 * Extract token from cookies (web)
 */
export function extractCookieToken(
  request: Request,
  cookieName: string = 'aivo_access_token'
): string | null {
  const cookies = request.headers.get('Cookie') || '';
  const match = cookies.match(new RegExp(`${cookieName}=([^;]+)`));
  return match?.[1] ?? null;
}

/**
 * Extract access token from request
 * Tries Authorization header first, then cookies
 */
export function extractAccessToken(request: Request): string | null {
  return extractBearerToken(request) ?? extractCookieToken(request);
}

/**
 * Extract refresh token from request
 */
export function extractRefreshToken(request: Request): string | null {
  return extractCookieToken(request, 'aivo_refresh_token');
}

// =============================================================================
// Client Information
// =============================================================================

/**
 * Get client IP address from request
 * Checks multiple headers for proxy/cdn scenarios
 */
export function getClientIP(request: Request): string | null {
  return (
    request.headers.get('CF-Connecting-IP') ||
    request.headers.get('X-Forwarded-For')?.split(',')[0]?.trim() ||
    request.headers.get('X-Real-IP') ||
    request.headers.get('X-Client-IP') ||
    null
  );
}

/**
 * Get User-Agent from request
 */
export function getUserAgent(request: Request): string | null {
  return request.headers.get('User-Agent');
}

/**
 * Detect client type from User-Agent and headers
 */
export function getClientType(request: Request): ClientType {
  const ua = request.headers.get('User-Agent') || '';

  // Check mobile indicators
  const secChUaMobile = request.headers.get('Sec-CH-UA-Mobile');
  if (secChUaMobile === '?1') {
    const platform = request.headers.get('Sec-CH-UA-Platform') || '';
    const platformLower = platform.toLowerCase().replace(/"/g, '');

    if (platformLower.includes('ios') || ua.includes('iPhone') || ua.includes('iPad')) {
      return 'ios';
    }
    if (platformLower.includes('android')) {
      return 'android';
    }
  }

  // Check User-Agent directly
  if (ua.includes('iPhone') || ua.includes('iPad') || ua.includes('iPod')) {
    return 'ios';
  }
  if (ua.includes('Android')) {
    return 'android';
  }

  // Default to web
  return 'web';
}

/**
 * Get device info from request
 */
export function getDeviceInfo(request: Request): {
  clientType: ClientType;
  userAgent: string | null;
  ipAddress: string | null;
  platform: string | null;
} {
  const ua = request.headers.get('User-Agent') || '';
  const platform = request.headers.get('Sec-CH-UA-Platform')?.replace(/"/g, '') ?? null;

  return {
    clientType: getClientType(request),
    userAgent: ua || null,
    ipAddress: getClientIP(request),
    platform,
  };
}

// =============================================================================
// Request ID
// =============================================================================

/**
 * Get or generate request ID
 */
export function getRequestId(request: Request): string {
  return (
    request.headers.get('X-Request-ID') ||
    request.headers.get('CF-Ray') ||
    crypto.randomUUID()
  );
}

/**
 * Get correlation ID for distributed tracing
 */
export function getCorrelationId(request: Request): string | null {
  return (
    request.headers.get('X-Correlation-ID') ||
    request.headers.get('X-Trace-ID') ||
    null
  );
}

// =============================================================================
// Origin/Referer
// =============================================================================

/**
 * Get request origin
 */
export function getOrigin(request: Request): string | null {
  return request.headers.get('Origin');
}

/**
 * Get request referer
 */
export function getReferer(request: Request): string | null {
  return request.headers.get('Referer');
}

/**
 * Check if request is from allowed origin
 */
export function isAllowedOrigin(request: Request, allowedOrigins: string[]): boolean {
  const origin = getOrigin(request);
  if (!origin) return false;
  return allowedOrigins.includes(origin);
}

// =============================================================================
// Content Type
// =============================================================================

/**
 * Check if request is JSON
 */
export function isJsonRequest(request: Request): boolean {
  const contentType = request.headers.get('Content-Type') || '';
  return contentType.includes('application/json');
}

/**
 * Check if request accepts JSON
 */
export function acceptsJson(request: Request): boolean {
  const accept = request.headers.get('Accept') || '';
  return accept.includes('application/json') || accept.includes('*/*');
}

// =============================================================================
// Rate Limiting
// =============================================================================

/**
 * Get rate limit info from response headers
 */
export function getRateLimitInfo(response: Response): {
  limit: number | null;
  remaining: number | null;
  reset: number | null;
} {
  return {
    limit: parseInt(response.headers.get('X-RateLimit-Limit') || '') || null,
    remaining: parseInt(response.headers.get('X-RateLimit-Remaining') || '') || null,
    reset: parseInt(response.headers.get('X-RateLimit-Reset') || '') || null,
  };
}
