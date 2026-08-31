/**
 * Swagger/OpenAPI utilities for Hono Cloudflare Workers
 * 
 * This module provides utilities for generating OpenAPI specifications
 * and serving Swagger UI in Cloudflare Workers environment.
 */

// Re-export types
export type { OpenAPISpec, PathItem, Operation, Parameter, Schema, Response, MediaType, SecurityScheme, SecurityRequirement, Tag } from './types.js';
export type { IOperationBuilder, IPathBuilder } from './types.js';

// Re-export builder classes
export { OperationBuilder, PathBuilder, SpecBuilder, op, path, ref, arraySchema, objectSchema, stringSchema, numberSchema, booleanSchema, createSpec } from './spec-builder.js';

// Re-export handler functions
export { createSwaggerHandler, mountSwaggerRoutes, healthResponseSchema } from './swagger-handler.js';

/**
 * Common OpenAPI schemas for API documentation
 */
export const COMMON_SCHEMAS = {
  Error: {
    type: 'object',
    properties: {
      error: {
        type: 'object',
        properties: {
          code: { type: 'string', example: 'ERROR_CODE' },
          message: { type: 'string', example: 'Error message' },
          requestId: { type: 'string', example: 'req_abc123' },
          details: {
            type: 'array',
            items: { $ref: '#/components/schemas/ValidationError' }
          }
        },
        required: ['code', 'message']
      }
    },
    required: ['error']
  },
  
  ValidationError: {
    type: 'object',
    properties: {
      field: { type: 'string', example: 'email' },
      message: { type: 'string', example: 'Invalid email format' }
    }
  },
  
  HealthResponse: {
    type: 'object',
    properties: {
      status: { type: 'string', example: 'ok' },
      timestamp: { type: 'integer', example: 1733020800000 },
      version: { type: 'string', example: '1.0.0' },
      service: { type: 'string', example: 'auth' }
    }
  },
  
  Pagination: {
    type: 'object',
    properties: {
      total: { type: 'integer', example: 100 },
      limit: { type: 'integer', example: 20 },
      offset: { type: 'integer', example: 0 },
      hasMore: { type: 'boolean', example: true }
    }
  },
  
  PaginationParams: {
    type: 'object',
    properties: {
      limit: { type: 'integer', minimum: 1, maximum: 100, default: 20, description: 'Number of items to return' },
      offset: { type: 'integer', minimum: 0, default: 0, description: 'Number of items to skip' }
    }
  }
} as const;

/**
 * Common security schemes
 */
export const SECURITY_SCHEMES = {
  BearerAuth: {
    type: 'http',
    scheme: 'bearer',
    bearerFormat: 'JWT',
    description: 'JWT token obtained from the authentication endpoint'
  }
} as const;

/**
 * Create a basic OpenAPI spec for a service
 */
export function createBasicSpec(serviceName: string, serviceVersion: string = '1.0.0') {
  return {
    openapi: '3.0.3',
    info: {
      title: `${serviceName} API`,
      version: serviceVersion,
      description: `API documentation for the ${serviceName} service`,
      contact: {
        name: 'AIVO API Support',
        email: 'api@aivo.app'
      }
    },
    servers: [
      {
        url: '/',
        description: 'Current service'
      }
    ],
    paths: {},
    components: {
      schemas: {
        ...COMMON_SCHEMAS
      },
      securitySchemes: {
        ...SECURITY_SCHEMES
      }
    },
    tags: []
  };
}
