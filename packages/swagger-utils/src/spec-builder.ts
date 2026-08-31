/**
 * OpenAPI Spec Builder - Fluent API for building OpenAPI specifications
 */

import type { 
  OpenAPISpec, 
  PathItem, 
  Operation, 
  Parameter, 
  Schema, 
  Response,
  SecurityRequirement,
  Tag
} from './types.js';

/**
 * Operation builder for fluent API
 */
export class OperationBuilder implements Partial<Operation> {
  private operation: Partial<Operation> = {};
  private responses: Record<string, Response> = {};
  private parameters: Parameter[] = [];

  summary(summary: string): this {
    this.operation.summary = summary;
    return this;
  }

  description(description: string): this {
    this.operation.description = description;
    return this;
  }

  operationId(id: string): this {
    this.operation.operationId = id;
    return this;
  }

  tags(...tags: string[]): this {
    this.operation.tags = tags;
    return this;
  }

  tag(tag: string): this {
    this.operation.tags = [tag];
    return this;
  }

  param(config: Omit<Parameter, 'name' | 'in'> & { name: string; in: Parameter['in'] }): this {
    this.parameters.push({
      name: config.name,
      in: config.in,
      description: config.description,
      required: config.required,
      schema: config.schema,
      example: config.example
    });
    return this;
  }

  query(name: string, schema: Schema, required?: boolean, description?: string): this {
    this.parameters.push({
      name,
      in: 'query',
      description,
      required,
      schema
    });
    return this;
  }

  path(name: string, schema: Schema, required: boolean = true, description?: string): this {
    this.parameters.push({
      name,
      in: 'path',
      description,
      required,
      schema: { ...schema }
    });
    return this;
  }

  header(name: string, schema: Schema, description?: string): this {
    this.parameters.push({
      name,
      in: 'header',
      description,
      required: false,
      schema
    });
    return this;
  }

  body(schema: Schema | { $ref: string }, required: boolean = true, description?: string): this {
    const contentType = 'application/json';
    this.operation.requestBody = {
      required,
      description,
      content: {
        [contentType]: {
          schema
        }
      }
    };
    return this;
  }

  response(code: string, description: string, schema?: Schema | { $ref: string }): this {
    const response: Response = { description };
    if (schema) {
      response.content = {
        'application/json': { schema }
      };
    }
    this.responses[code] = response;
    return this;
  }

  security(scheme: string, ...scopes: string[]): this {
    this.operation.security = [{ [scheme]: scopes }];
    return this;
  }

  auth(): this {
    this.operation.security = [{ BearerAuth: [] }];
    return this;
  }

  deprecated(): this {
    this.operation.deprecated = true;
    return this;
  }

  build(): Operation {
    return {
      ...this.operation,
      parameters: this.parameters.length > 0 ? this.parameters : undefined,
      responses: Object.keys(this.responses).length > 0 ? this.responses : undefined
    } as Operation;
  }
}

/**
 * Path builder for fluent API
 */
export class PathBuilder {
  private path: Partial<PathItem> = {};

  get(operation: Operation): this {
    this.path.get = operation;
    return this;
  }

  post(operation: Operation): this {
    this.path.post = operation;
    return this;
  }

  put(operation: Operation): this {
    this.path.put = operation;
    return this;
  }

  patch(operation: Operation): this {
    this.path.patch = operation;
    return this;
  }

  delete(operation: Operation): this {
    this.path.delete = operation;
    return this;
  }

  build(): PathItem {
    return this.path as PathItem;
  }
}

/**
 * Create an operation builder
 */
export function op(): OperationBuilder {
  return new OperationBuilder();
}

/**
 * Create a path builder
 */
export function path(): PathBuilder {
  return new PathBuilder();
}

/**
 * Create a schema reference
 */
export function ref(schemaName: string): { $ref: string } {
  return { $ref: `#/components/schemas/${schemaName}` };
}

/**
 * Create an array schema
 */
export function arraySchema(items: Schema | { $ref: string }): Schema {
  return { type: 'array', items };
}

/**
 * Create an object schema
 */
export function objectSchema(properties: Record<string, Schema | { $ref: string }>, required?: string[]): Schema {
  return { type: 'object', properties, required };
}

/**
 * Create a string schema
 */
export function stringSchema(
  format?: string,
  enumValues?: string[],
  minLength?: number,
  maxLength?: number
): Schema {
  const schema: Schema = { type: 'string' };
  if (format) schema.format = format;
  if (enumValues) schema.enum = enumValues;
  if (minLength !== undefined) schema.minLength = minLength;
  if (maxLength !== undefined) schema.maxLength = maxLength;
  return schema;
}

/**
 * Create an integer/number schema
 */
export function numberSchema(
  type: 'integer' | 'number',
  minimum?: number,
  maximum?: number
): Schema {
  const schema: Schema = { type };
  if (minimum !== undefined) schema.minimum = minimum;
  if (maximum !== undefined) schema.maximum = maximum;
  return schema;
}

/**
 * Create a boolean schema
 */
export function booleanSchema(defaultValue?: boolean): Schema {
  const schema: Schema = { type: 'boolean' };
  if (defaultValue !== undefined) schema.default = defaultValue;
  return schema;
}

/**
 * OpenAPI spec builder class
 */
export class SpecBuilder {
  private spec: OpenAPISpec;

  constructor(serviceName: string, version: string = '1.0.0') {
    this.spec = {
      openapi: '3.0.3',
      info: {
        title: `${serviceName} API`,
        version,
        description: `API documentation for the ${serviceName} service`,
        contact: {
          name: 'AIVO API Support',
          email: 'api@aivo.app'
        }
      },
      servers: [{ url: '/', description: 'Current service' }],
      paths: {},
      components: {
        schemas: {},
        securitySchemes: {
          BearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
            description: 'JWT token obtained from the authentication endpoint'
          }
        }
      },
      tags: []
    };
  }

  title(title: string): this {
    this.spec.info.title = title;
    return this;
  }

  description(description: string): this {
    this.spec.info.description = description;
    return this;
  }

  server(url: string, description?: string): this {
    this.spec.servers = this.spec.servers || [];
    this.spec.servers.push({ url, description });
    return this;
  }

  addSchema(name: string, schema: Schema): this {
    this.spec.components!.schemas![name] = schema;
    return this;
  }

  addSecurityScheme(name: string, scheme: { type: string; [key: string]: unknown }): this {
    this.spec.components!.securitySchemes![name] = scheme as any;
    return this;
  }

  addTag(name: string, description?: string): this {
    this.spec.tags!.push({ name, description });
    return this;
  }

  path(path: string, item: PathItem): this {
    this.spec.paths[path] = item;
    return this;
  }

  addPath(
    path: string,
    method: 'get' | 'post' | 'put' | 'patch' | 'delete' | 'head' | 'options',
    operation: Operation
  ): this {
    if (!this.spec.paths[path]) {
      this.spec.paths[path] = {};
    }
    this.spec.paths[path][method] = operation;
    return this;
  }

  build(): OpenAPISpec {
    return JSON.parse(JSON.stringify(this.spec));
  }
}

/**
 * Create a spec builder
 */
export function createSpec(name: string, version?: string): SpecBuilder {
  return new SpecBuilder(name, version);
}
