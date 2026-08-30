/**
 * Cloudflare Workers Environment Types
 */

export interface Env {
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
  
  // KV Namespace for OAuth state (optional)
  OAUTH_STATE?: KVNamespace;
}
