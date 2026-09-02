/**
 * JWT Service for Authentication
 * 
 * Handles JWT token generation and verification using JOSE library.
 * Supports ES256 algorithm for secure token signing.
 */

// Use jose with explicit type handling
import * as jose from 'jose';
import type { JWTPayload, JWTConfig, JWTGenerationOptions, JWTVerificationResult } from './types/jwt.js';
import { JWT_DEFAULTS } from './types/jwt.js';

/**
 * Convert base64 string to Uint8Array
 */
function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Convert Uint8Array, ArrayBuffer, or string to base64 string
 */
function toBase64(data: Uint8Array | ArrayBuffer | string): string {
  if (typeof data === 'string') {
    return btoa(data);
  }
  const bytes = data instanceof ArrayBuffer ? new Uint8Array(data) : data;
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * JWT Service class for token operations
 */
export class JWTService {
  private privateKey: CryptoKey | null = null;
  private publicKey: unknown = null; // jose.KeyLike
  private issuer: string;
  private audience: string;
  private accessTokenTTL: number;

  constructor(config: JWTConfig = {}) {
    this.issuer = config.issuer ?? JWT_DEFAULTS.ISSUER;
    this.audience = config.audience ?? JWT_DEFAULTS.AUDIENCE;
    this.accessTokenTTL = config.accessTokenTTL ?? JWT_DEFAULTS.ACCESS_TOKEN_TTL;
  }

  /**
   * Initialize service from environment variables
   */
  static async fromEnvironment(env: {
    AUTH_JWT_PRIVATE_KEY?: string;
    AUTH_JWT_PUBLIC_KEY?: string;
    AUTH_JWT_ISSUER?: string;
    AUTH_JWT_AUDIENCE?: string;
    AUTH_JWT_ACCESS_TOKEN_TTL?: string;
  }): Promise<JWTService> {
    const config: JWTConfig = {
      issuer: env.AUTH_JWT_ISSUER,
      audience: env.AUTH_JWT_AUDIENCE,
      accessTokenTTL: env.AUTH_JWT_ACCESS_TOKEN_TTL
        ? parseInt(env.AUTH_JWT_ACCESS_TOKEN_TTL, 10)
        : undefined,
    };

    const service = new JWTService(config);

    // Import keys if provided
    if (env.AUTH_JWT_PRIVATE_KEY) {
      await service.importPrivateKey(env.AUTH_JWT_PRIVATE_KEY);
    }

    if (env.AUTH_JWT_PUBLIC_KEY) {
      await service.importPublicKey(env.AUTH_JWT_PUBLIC_KEY);
    }

    return service;
  }

  /**
   * Import private key from base64 encoded PEM
   */
  async importPrivateKey(base64: string): Promise<void> {
    const keyData = base64ToUint8Array(base64);
    // Convert to UTF-8 string for PEM format
    const pemString = new TextDecoder().decode(keyData);
    // @ts-expect-error - jose types
    this.privateKey = await jose.importPKCS8(pemString, JWT_DEFAULTS.ALGORITHM);
  }

  /**
   * Import public key from base64 encoded PEM
   */
  async importPublicKey(base64: string): Promise<void> {
    const keyData = base64ToUint8Array(base64);
    // Convert to UTF-8 string for PEM format
    const pemString = new TextDecoder().decode(keyData);
    // @ts-expect-error - jose types
    this.publicKey = await jose.importSPKI(pemString, JWT_DEFAULTS.ALGORITHM);
  }

  /**
   * Set keys directly
   */
  setKeys(privateKey: CryptoKey, publicKey: unknown): void {
    this.privateKey = privateKey;
    this.publicKey = publicKey;
  }

  /**
   * Check if keys are configured
   */
  hasKeys(): boolean {
    return this.privateKey !== null && this.publicKey !== null;
  }

  /**
   * Check if signing key is available
   */
  canSign(): boolean {
    return this.privateKey !== null;
  }

  /**
   * Check if verification key is available
   */
  canVerify(): boolean {
    return this.publicKey !== null;
  }

  /**
   * Generate a new key pair
   */
  static async generateKeyPair(): Promise<{ privateKey: CryptoKey; publicKey: unknown }> {
    const keyPair = await jose.generateKeyPair(JWT_DEFAULTS.ALGORITHM, {
      extractable: true,
    });
    return { 
      privateKey: keyPair.privateKey as CryptoKey, 
      publicKey: keyPair.publicKey as unknown 
    };
  }

  /**
   * Export key pair to base64 strings for storage
   */
  static async exportKeyPair(
    privateKey: CryptoKey,
    publicKey: CryptoKey
  ): Promise<{ privateKeyBase64: string; publicKeyBase64: string }> {
    const privateKeyExported = await jose.exportPKCS8(privateKey);
    const publicKeyExported = await jose.exportSPKI(publicKey);

    return {
      privateKeyBase64: toBase64(privateKeyExported),
      publicKeyBase64: toBase64(publicKeyExported),
    };
  }

  /**
   * Generate access token
   */
  async generateAccessToken(options: JWTGenerationOptions): Promise<{
    token: string;
    expiresAt: number;
  }> {
    if (!this.privateKey) {
      throw new Error('Private key not configured for signing');
    }

    const now = Math.floor(Date.now() / 1000);
    const expiresAt = now + this.accessTokenTTL;
    const jti = generateSecureId();

    const payload: JWTPayload = {
      iss: this.issuer,
      aud: this.audience,
      sub: options.userId,
      iat: now,
      exp: expiresAt,
      jti,
      sid: options.sessionId,
      ver: options.authVersion,
      roles: options.roles,
    };

    const token = await new jose.SignJWT(payload as unknown as jose.JWTPayload)
      .setProtectedHeader({ alg: JWT_DEFAULTS.ALGORITHM })
      .setIssuedAt()
      .setExpirationTime(expiresAt)
      .setIssuer(this.issuer)
      .setAudience(this.audience)
      .sign(this.privateKey);

    return { token, expiresAt };
  }

  /**
   * Verify and decode access token
   */
  async verifyAccessToken(token: string): Promise<JWTVerificationResult> {
    if (!this.publicKey) {
      return {
        valid: false,
        error: 'Public key not configured for verification',
      };
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await jose.jwtVerify(token, this.publicKey as any, {
        issuer: this.issuer,
        audience: this.audience,
      });

      const payload = result.payload as Record<string, unknown>;

      const jwtPayload: JWTPayload = {
        iss: typeof payload.iss === 'string' ? payload.iss : this.issuer,
        aud: typeof payload.aud === 'string' ? payload.aud : this.audience,
        sub: typeof payload.sub === 'string' ? payload.sub : '',
        iat: typeof payload.iat === 'number' ? payload.iat : 0,
        exp: typeof payload.exp === 'number' ? payload.exp : 0,
        jti: typeof payload.jti === 'string' ? payload.jti : '',
        sid: (payload.sid as string) ?? '',
        ver: (payload.ver as number) ?? 1,
        roles: (payload.roles as string[]) ?? [],
      };

      return {
        valid: true,
        payload: jwtPayload,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      // Provide more specific error messages
      if (errorMessage.includes('expired')) {
        return { valid: false, error: 'Token has expired' };
      }
      if (errorMessage.includes('signature')) {
        return { valid: false, error: 'Invalid token signature' };
      }
      if (errorMessage.includes('issuer')) {
        return { valid: false, error: 'Invalid token issuer' };
      }
      if (errorMessage.includes('audience')) {
        return { valid: false, error: 'Invalid token audience' };
      }

      return { valid: false, error: errorMessage };
    }
  }

  /**
   * Decode token without verification (for debugging)
   */
  decodeToken(token: string): JWTPayload | null {
    try {
      const payload = jose.decodeJwt(token) as Record<string, unknown>;
      return {
        iss: (payload.iss as string) ?? this.issuer,
        aud: (payload.aud as string) ?? this.audience,
        sub: (payload.sub as string) ?? '',
        iat: (payload.iat as number) ?? 0,
        exp: (payload.exp as number) ?? 0,
        jti: (payload.jti as string) ?? '',
        sid: (payload.sid as string) ?? '',
        ver: (payload.ver as number) ?? 1,
        roles: (payload.roles as string[]) ?? [],
      };
    } catch {
      return null;
    }
  }

  /**
   * Get configured TTL in seconds
   */
  getAccessTokenTTL(): number {
    return this.accessTokenTTL;
  }

  /**
   * Get issuer
   */
  getIssuer(): string {
    return this.issuer;
  }

  /**
   * Get audience
   */
  getAudience(): string {
    return this.audience;
  }
}

/**
 * Generate a secure random ID
 */
function generateSecureId(): string {
  const array = new Uint8Array(16);
  const cryptoObj = globalThis as unknown as { crypto?: Crypto };
  cryptoObj.crypto?.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

// =============================================================================
// Singleton Instance
// =============================================================================

let defaultJWTService: JWTService | null = null;

/**
 * Get or create default JWT service
 */
export function getJWTService(): JWTService {
  if (!defaultJWTService) {
    defaultJWTService = new JWTService({});
  }
  return defaultJWTService;
}

/**
 * Set default JWT service instance
 */
export function setJWTService(service: JWTService): void {
  defaultJWTService = service;
}

/**
 * Reset default JWT service (for testing)
 */
export function resetJWTService(): void {
  defaultJWTService = null;
}
