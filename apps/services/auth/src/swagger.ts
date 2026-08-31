/**
 * Auth Service - OpenAPI/Swagger Documentation
 */

import { createSpec, op, path, ref, stringSchema, objectSchema, arraySchema, numberSchema } from '@repo/swagger-utils/spec-builder';
import { mountSwaggerRoutes, healthResponseSchema } from '@repo/swagger-utils/swagger-handler';
import type { Hono } from 'hono';
import type { Env } from './index.js';

/**
 * Create OpenAPI specification for the Auth service
 */
export function createAuthSwaggerSpec() {
  return createSpec('AIVO Auth', '1.0.0')
    .title('AIVO Authentication API')
    .description(`
      Authentication and user management API for the AIVO platform.
      
      ## Features
      - User registration with email/password
      - Email/password login
      - JWT token management
      - OAuth authentication (Google, Facebook)
      - Session management
      - Account management
      
      ## Authentication
      Most endpoints require a valid JWT access token in the Authorization header:
      \`Authorization: Bearer <access_token>\`
    `)
    .server('http://localhost:3001', 'Local development')
    .server('https://auth.aivo.app', 'Production')
    .addTag('Authentication', 'User authentication and token management')
    .addTag('Registration', 'User registration and email verification')
    .addTag('OAuth', 'OAuth 2.0 social authentication')
    .addTag('Sessions', 'Session management')
    .addTag('Account', 'Account management')
    .addTag('Admin', 'Administrative operations')
    // Common schemas
    .addSchema('User', {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid', description: 'User unique identifier' },
        email: { type: 'string', format: 'email', description: 'User email address' },
        displayName: { type: 'string', description: 'User display name' },
        avatarUrl: { type: 'string', format: 'uri', description: 'User avatar URL' },
        status: { type: 'string', enum: ['pending_verification', 'active', 'suspended', 'deleted'], description: 'Account status' },
        emailVerifiedAt: { type: 'integer', description: 'Email verification timestamp' },
        createdAt: { type: 'integer', description: 'Account creation timestamp' }
      }
    })
    .addSchema('TokenPair', {
      type: 'object',
      properties: {
        accessToken: { type: 'string', description: 'JWT access token' },
        refreshToken: { type: 'string', description: 'Refresh token' },
        expiresIn: { type: 'integer', description: 'Access token expiry in seconds' },
        tokenType: { type: 'string', example: 'Bearer' }
      },
      required: ['accessToken', 'expiresIn', 'tokenType']
    })
    .addSchema('Session', {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Session ID' },
        clientType: { type: 'string', enum: ['web', 'mobile', 'api'], description: 'Client type' },
        deviceName: { type: 'string', description: 'Device name' },
        platform: { type: 'string', description: 'Platform (iOS, Android, etc.)' },
        createdAt: { type: 'integer', description: 'Session creation timestamp' },
        lastActiveAt: { type: 'integer', description: 'Last activity timestamp' },
        expiresAt: { type: 'integer', description: 'Session expiry timestamp' },
        isCurrent: { type: 'boolean', description: 'Is this the current session' }
      }
    })
    .addSchema('RegistrationRequest', {
      type: 'object',
      properties: {
        email: { type: 'string', format: 'email', description: 'Email address' },
        password: { type: 'string', format: 'password', description: 'Password (min 8 chars, must contain uppercase, lowercase, and number)' },
        displayName: { type: 'string', minLength: 2, maxLength: 100, description: 'Display name (optional)' }
      },
      required: ['email', 'password']
    })
    .addSchema('LoginRequest', {
      type: 'object',
      properties: {
        email: { type: 'string', format: 'email', description: 'Email address' },
        password: { type: 'string', description: 'Password' }
      },
      required: ['email', 'password']
    })
    .addSchema('RefreshTokenRequest', {
      type: 'object',
      properties: {
        refreshToken: { type: 'string', description: 'Refresh token' }
      }
    })
    // Health endpoint
    .path('/health', path()
      .get(op()
        .summary('Health check')
        .description('Check if the auth service is running')
        .tag('Health')
        .response('200', 'Service is healthy', healthResponseSchema('auth'))
        .build())
      .build())
    // Auth routes
    .path('/auth/me', path()
      .get(op()
        .summary('Get current user')
        .description('Get the currently authenticated user information')
        .tag('Authentication')
        .auth()
        .response('200', 'User information', objectSchema({
          user: ref('User'),
          roles: arraySchema(stringSchema()),
          session: ref('Session')
        }))
        .response('401', 'Unauthorized')
        .build())
      .build())
    .path('/auth/refresh', path()
      .post(op()
        .summary('Refresh access token')
        .description('Exchange a refresh token for a new access token')
        .tag('Authentication')
        .response('200', 'New token pair', ref('TokenPair'))
        .response('401', 'Invalid refresh token')
        .build())
      .build())
    .path('/auth/logout', path()
      .post(op()
        .summary('Logout')
        .description('Logout the current session')
        .tag('Authentication')
        .auth()
        .response('200', 'Logged out successfully')
        .response('401', 'Unauthorized')
        .build())
      .build())
    .path('/auth/logout-all', path()
      .post(op()
        .summary('Logout all sessions')
        .description('Logout from all sessions except current')
        .tag('Authentication')
        .auth()
        .response('200', 'All sessions logged out')
        .response('401', 'Unauthorized')
        .build())
      .build())
    // Registration routes
    .path('/register', path()
      .post(op()
        .summary('Register new user')
        .description('Create a new user account with email and password')
        .tag('Registration')
        .body(objectSchema({
          email: stringSchema('email'),
          password: stringSchema(),
          displayName: stringSchema()
        }), true, 'Registration data')
        .response('201', 'Account created', objectSchema({
          user: ref('User'),
          message: stringSchema(),
          requiresEmailVerification: { type: 'boolean' }
        }))
        .response('400', 'Validation error')
        .response('429', 'Too many requests')
        .build())
      .build())
    // Session routes
    .path('/sessions', path()
      .get(op()
        .summary('List sessions')
        .description('Get all active sessions for the current user')
        .tag('Sessions')
        .auth()
        .response('200', 'Session list', objectSchema({
          sessions: arraySchema(ref('Session'))
        }))
        .response('401', 'Unauthorized')
        .build())
      .delete(op()
        .summary('Revoke all sessions')
        .description('Revoke all sessions except the current one')
        .tag('Sessions')
        .auth()
        .response('200', 'Sessions revoked')
        .response('401', 'Unauthorized')
        .build())
      .build())
    .path('/sessions/{sessionId}', path()
      .delete(op()
        .summary('Revoke session')
        .description('Revoke a specific session by ID')
        .tag('Sessions')
        .auth()
        .path('sessionId', stringSchema(), true, 'Session ID to revoke')
        .response('200', 'Session revoked')
        .response('400', 'Cannot revoke current session')
        .response('404', 'Session not found')
        .build())
      .build())
    .build();
}

/**
 * Mount Swagger routes on the auth app
 */
export function mountAuthSwagger(app: Hono<{ Bindings: Env }>) {
  const spec = createAuthSwaggerSpec();
  mountSwaggerRoutes(app, spec, {
    title: 'AIVO Auth API',
    path: ''
  });
}
