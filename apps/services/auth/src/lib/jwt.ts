/**
 * JWT utilities using JOSE library
 * Creates and validates JWT access tokens
 */

import * as jose from 'jose';
import type { JWTPayload } from '../types';

const JWT_ISSUER = 'aivo';
const JWT_ALGORITHM = 'ES256' as const;

/**
 * JWT Service for token generation and validation
 */
export class JWTService {
  private privateKey: CryptoKey | null = null;
  private publicKey: CryptoKey | null = null;
  private issuer: string;
  private audience: string;
  private accessTokenTTL: number; // seconds
  
  constructor(options: {
    privateKey?: CryptoKey;
    publicKey?: CryptoKey;
    issuer?: string;
    audience?: string;
    accessTokenTTL?: number;
  }) {
    this.privateKey = options.privateKey ?? null;
    this.publicKey = options.publicKey ?? null;
    this.issuer = options.issuer ?? JWT_ISSUER;
    this.audience = options.audience ?? 'aivo-app';
    this.accessTokenTTL = options.accessTokenTTL ?? 15 * 60; // 15 minutes default
  }
  
  /**
   * Initialize with keys from environment
   */
  static async fromEnvironment(env: {
    AUTH_JWT_PRIVATE_KEY?: string;
    AUTH_JWT_PUBLIC_KEY?: string;
    AUTH_JWT_ISSUER?: string;
    AUTH_JWT_AUDIENCE?: string;
    AUTH_JWT_ACCESS_TOKEN_TTL?: string;
  }): Promise<JWTService> {
    let privateKey: CryptoKey | undefined;
    let publicKey: CryptoKey | undefined;
    
    if (env.AUTH_JWT_PRIVATE_KEY) {
      privateKey = await importPrivateKey(env.AUTH_JWT_PRIVATE_KEY);
    }
    
    if (env.AUTH_JWT_PUBLIC_KEY) {
      publicKey = await importPublicKey(env.AUTH_JWT_PUBLIC_KEY);
    }
    
    return new JWTService({
      privateKey,
      publicKey,
      issuer: env.AUTH_JWT_ISSUER,
      audience: env.AUTH_JWT_AUDIENCE,
      accessTokenTTL: env.AUTH_JWT_ACCESS_TOKEN_TTL ? parseInt(env.AUTH_JWT_ACCESS_TOKEN_TTL, 10) : undefined,
    });
  }
  
  /**
   * Set keys directly
   */
  setKeys(privateKey: CryptoKey, publicKey: CryptoKey): void {
    this.privateKey = privateKey;
    this.publicKey = publicKey;
  }
  
  /**
   * Check if keys are available
   */
  hasKeys(): boolean {
    return this.privateKey !== null && this.publicKey !== null;
  }
  
  /**
   * Generate a new key pair
   */
  static async generateKeyPair(): Promise<{ privateKey: CryptoKey; publicKey: CryptoKey }> {
    const { privateKey, publicKey } = await jose.generateKeyPair(JWT_ALGORITHM, { extractable: true });
    return { privateKey, publicKey };
  }
  
  /**
   * Export keys to base64 strings for storage
   */
  static async exportKeyPair(privateKey: CryptoKey, publicKey: CryptoKey): Promise<{
    privateKeyBase64: string;
    publicKeyBase64: string;
  }> {
    const privateKeyExported = await jose.exportPKCS8(privateKey);
    const publicKeyExported = await jose.exportSPKI(publicKey);
    
    return {
      privateKeyBase64: btoa(String.fromCharCode(...new Uint8Array(privateKeyExported))),
      publicKeyBase64: btoa(String.fromCharCode(...new Uint8Array(publicKeyExported))),
    };
  }
  
  /**
   * Generate access token
   */
  async generateAccessToken(payload: {
    userId: string;
    sessionId: string;
    authVersion: number;
    roles: string[];
  }): Promise<{ token: string; expiresAt: number }> {
    if (!this.privateKey) {
      throw new Error('Private key not configured');
    }
    
    const now = Math.floor(Date.now() / 1000);
    const expiresAt = now + this.accessTokenTTL;
    const jti = generateSecureId();
    
    const tokenPayload: JWTPayload = {
      iss: this.issuer,
      aud: this.audience,
      sub: payload.userId,
      iat: now,
      exp: expiresAt,
      jti,
      sid: payload.sessionId,
      ver: payload.authVersion,
      roles: payload.roles,
    };
    
    const token = await new jose.SignJWT(tokenPayload as unknown as jose.JWTPayload)
      .setProtectedHeader({ alg: JWT_ALGORITHM })
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
  async verifyAccessToken(token: string): Promise<JWTPayload | null> {
    if (!this.publicKey) {
      console.error('Public key not configured for verification');
      return null;
    }
    
    try {
      const { payload } = await jose.jwtVerify(token, this.publicKey, {
        issuer: this.issuer,
        audience: this.audience,
      });
      
      return {
        iss: payload.iss!,
        aud: payload.aud!,
        sub: payload.sub!,
        iat: payload.iat!,
        exp: payload.exp!,
        jti: payload.jti!,
        sid: payload.sid as string,
        ver: payload.ver as number,
        roles: payload.roles as string[],
      };
    } catch (error) {
      console.error('JWT verification failed:', error);
      return null;
    }
  }
  
  /**
   * Decode token without verification (for debugging)
   */
  decodeToken(token: string): JWTPayload | null {
    try {
      const { payload } = jose.decodeJwt(token);
      return {
        iss: payload.iss!,
        aud: payload.aud!,
        sub: payload.sub!,
        iat: payload.iat!,
        exp: payload.exp!,
        jti: payload.jti!,
        sid: payload.sid as string,
        ver: payload.ver as number,
        roles: payload.roles as string[],
      };
    } catch {
      return null;
    }
  }
  
  /**
   * Get configured TTL
   */
  getAccessTokenTTL(): number {
    return this.accessTokenTTL;
  }
}

/**
 * Import private key from base64 PEM
 */
async function importPrivateKey(base64: string): Promise<CryptoKey> {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return jose.importPKCS8(bytes.buffer, JWT_ALGORITHM);
}

/**
 * Import public key from base64 PEM
 */
async function importPublicKey(base64: string): Promise<CryptoKey> {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return jose.importSPKI(bytes.buffer, JWT_ALGORITHM);
}

/**
 * Generate a secure random ID
 */
function generateSecureId(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

// Default singleton instance
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
 * Set default JWT service
 */
export function setJWTService(service: JWTService): void {
  defaultJWTService = service;
}
