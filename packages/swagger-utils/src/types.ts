/**
 * OpenAPI/Swagger types and interfaces
 */

export interface OpenAPISpec {
  openapi: string;
  info: {
    title: string;
    version: string;
    description?: string;
    contact?: {
      name?: string;
      email?: string;
      url?: string;
    };
  };
  servers?: Array<{
    url: string;
    description?: string;
  }>;
  paths: Record<string, PathItem>;
  components?: {
    schemas?: Record<string, Schema>;
    securitySchemes?: Record<string, SecurityScheme>;
  };
  tags?: Tag[];
}

export interface PathItem {
  get?: Operation;
  post?: Operation;
  put?: Operation;
  patch?: Operation;
  delete?: Operation;
  head?: Operation;
  options?: Operation;
}

export interface Operation {
  summary?: string;
  description?: string;
  operationId?: string;
  tags?: string[];
  parameters?: Parameter[];
  requestBody?: RequestBody;
  responses?: Record<string, Response>;
  security?: SecurityRequirement[];
  deprecated?: boolean;
}

export interface Parameter {
  name: string;
  in: 'query' | 'path' | 'header' | 'cookie';
  description?: string;
  required?: boolean;
  schema?: Schema;
  example?: unknown;
}

export interface RequestBody {
  description?: string;
  required?: boolean;
  content: Record<string, MediaType>;
}

export interface MediaType {
  schema?: Schema;
  example?: unknown;
}

export interface Response {
  description: string;
  content?: Record<string, MediaType>;
  headers?: Record<string, Parameter>;
}

export interface Schema {
  type?: string;
  format?: string;
  properties?: Record<string, Schema>;
  items?: Schema;
  required?: string[];
  enum?: unknown[];
  example?: unknown;
  description?: string;
  nullable?: boolean;
  default?: unknown;
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  $ref?: string;
  allOf?: Schema[];
  oneOf?: Schema[];
  anyOf?: Schema[];
}

export interface SecurityScheme {
  type: string;
  scheme?: string;
  bearerFormat?: string;
  description?: string;
  name?: string;
  in?: string;
}

export interface SecurityRequirement {
  [name: string]: string[];
}

export interface Tag {
  name: string;
  description?: string;
}

// Builder types
export interface PathBuilder {
  get(operation: Operation): PathBuilder;
  post(operation: Operation): PathBuilder;
  put(operation: Operation): PathBuilder;
  patch(operation: Operation): PathBuilder;
  delete(operation: Operation): PathBuilder;
  build(): PathItem;
}

export interface OperationBuilder {
  summary(summary: string): OperationBuilder;
  description(description: string): OperationBuilder;
  operationId(id: string): OperationBuilder;
  tags(...tags: string[]): OperationBuilder;
  param(param: Omit<Parameter, 'name' | 'in'> & { name: string; in: Parameter['in'] }): OperationBuilder;
  body(schema: Schema, required?: boolean): OperationBuilder;
  response(code: string, description: string, schema?: Schema): OperationBuilder;
  security(scheme: string): OperationBuilder;
  deprecated(): OperationBuilder;
  build(): Operation;
}
