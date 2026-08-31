/**
 * JWT Types for Authentication
 */

/**
 * JWT Payload Claims
 */
export interface JWTPayload {
  /** Issuer - identifies principal that issued the JWT */
  iss: string;
  /** Audience - identifies the recipients that the JWT is intended for */
  aud: string;
  /** Subject - identifies the principal that is the subject of the JWT */
  sub: string;
  /** Issued At - time at which the JWT was issued */
  iat: number;
  /** Expiration Time - time after which the JWT expires */
  exp: number;
  /** JWT ID - unique identifier for the JWT */
  jti: string;
  /** Session ID - associated session identifier */
  sid: string;
  /** Auth Version - version of authentication credentials */
  ver: number;
  /** Roles - array of role codes assigned to the user */
  roles: string[];
}

/**
 * JWT Configuration
 */
export interface JWTConfig {
  /** Private key for signing (base64 encoded PEM) */
  privateKey?: string;
  /** Public key for verification (base64 encoded PEM) */
  publicKey?: string;
  /** Token issuer identifier */
  issuer?: string;
  /** Token audience identifier */
  audience?: string;
  /** Access token TTL in seconds (default: 15 minutes) */
  accessTokenTTL?: number;
}

/**
 * JWT Generation Options
 */
export interface JWTGenerationOptions {
  /** User ID (subject) */
  userId: string;
  /** Session ID */
  sessionId: string;
  /** Auth version for invalidation */
  authVersion: number;
  /** User role codes */
  roles: string[];
}

/**
 * JWT Verification Result
 */
export interface JWTVerificationResult {
  /** Whether the token is valid */
  valid: boolean;
  /** Decoded payload if valid */
  payload?: JWTPayload;
  /** Error message if invalid */
  error?: string;
}

/**
 * Key pair for JWT signing
 */
export interface JWTKeyPair {
  privateKey: CryptoKey;
  publicKey: CryptoKey;
}

/**
 * Exported key pair (base64 encoded)
 */
export interface ExportedKeyPair {
  privateKeyBase64: string;
  publicKeyBase64: string;
}

/**
 * Default JWT constants
 */
export const JWT_DEFAULTS = {
  ISSUER: 'aivo',
  AUDIENCE: 'aivo-app',
  ALGORITHM: 'ES256' as const,
  ACCESS_TOKEN_TTL: 15 * 60, // 15 minutes
  REFRESH_TOKEN_TTL: 30 * 24 * 60 * 60, // 30 days
  SESSION_TTL: 30 * 24 * 60 * 60, // 30 days
};
