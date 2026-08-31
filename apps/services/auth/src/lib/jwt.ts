/**
 * JWT utilities using JOSE library
 * 
 * This module re-exports JWTService from auth-core for backward compatibility.
 * For new code, import directly from @aivo/auth-core.
 */

import { JWTService, getJWTService, setJWTService } from '@aivo/auth-core';

// Re-export everything from auth-core
export { JWTService, getJWTService, setJWTService } from '@aivo/auth-core';

// Re-export types
export type { JWTPayload, JWTConfig, JWTGenerationOptions, JWTVerificationResult } from '@aivo/auth-core';

// Default TTL constant for convenience
export const ACCESS_TOKEN_TTL = 15 * 60; // 15 minutes in seconds
