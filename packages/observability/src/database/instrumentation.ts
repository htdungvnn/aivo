/**
 * Database Instrumentation
 * 
 * Instruments database operations with:
 * - Operation tracing
 * - Query instrumentation
 * - Transaction tracking
 * - Error classification
 * - Metrics
 */

import { recordDatabaseOperation } from '../metrics.js';
import { createDatabaseSpan } from '../tracing.js';
import { createServiceLogger, type Logger } from '../logger.js';
import type { ServiceContext, NormalizedError } from '../types.js';
import { createNormalizedError, ERROR_CODES } from '../errors.js';

// =============================================================================
// Database Instrumentation
// =============================================================================

export interface DatabaseInstrumentationOptions {
  serviceContext: ServiceContext;
  logger?: Logger;
  /** Database name for logging */
  databaseName?: string;
  /** Slow query threshold in ms */
  slowQueryThresholdMs?: number;
}

/**
 * Create database instrumentation.
 */
export function createDatabaseInstrumentation(
  options: DatabaseInstrumentationOptions
): {
  instrumentQuery: <T>(
    operation: string,
    repository: string,
    queryFn: () => Promise<T>
  ) => Promise<T>;
  instrumentTransaction: <T>(
    operation: string,
    transactionFn: () => Promise<T>
  ) => Promise<T>;
  recordOperation: (
    operation: string,
    repository: string,
    durationMs: number,
    success: boolean,
    rowsAffected?: number,
    error?: NormalizedError
  ) => void;
} {
  const logger = options.logger || createServiceLogger(options.serviceContext.service);
  const slowQueryThreshold = options.slowQueryThresholdMs ?? 1000;
  
  return {
    /**
     * Instrument a database query.
     */
    async instrumentQuery<T>(
      operation: string,
      repository: string,
      queryFn: () => Promise<T>
    ): Promise<T> {
      const startTime = Date.now();
      
      // Create span
      const span = createDatabaseSpan(operation, repository, options.serviceContext);
      
      logger.debug(`Database query: ${repository}.${operation}`, {
        operation: 'db_query_start',
        repository,
        dbOperation: operation,
      });
      
      try {
        const result = await queryFn();
        const durationMs = Date.now() - startTime;
        
        // End span
        span.setAttribute('db.success', true);
        span.end();
        
        // Record metrics
        this.recordOperation(operation, repository, durationMs, true);
        
        // Log slow queries
        if (durationMs > slowQueryThreshold) {
          logger.warn(`Slow query: ${repository}.${operation}`, {
            operation: 'db_slow_query',
            repository,
            dbOperation: operation,
            durationMs,
            thresholdMs: slowQueryThreshold,
          });
        } else {
          logger.debug(`Database query complete: ${repository}.${operation}`, {
            operation: 'db_query_complete',
            repository,
            dbOperation: operation,
            durationMs,
          });
        }
        
        return result;
        
      } catch (error) {
        const durationMs = Date.now() - startTime;
        
        // End span with error
        span.recordError('DATABASE_ERROR', error instanceof Error ? error.message : 'Unknown error');
        span.end();
        
        // Normalize error
        const normalizedError = createNormalizedError(
          error,
          inferDatabaseErrorCode(error),
          undefined
        );
        
        // Record metrics
        this.recordOperation(operation, repository, durationMs, false, undefined, normalizedError);
        
        // Log error
        logger.error(`Database query failed: ${repository}.${operation}`, error instanceof Error ? error : undefined, {
          operation: 'db_query_error',
          repository,
          dbOperation: operation,
          durationMs,
          errorCode: normalizedError.code,
          category: normalizedError.category,
        });
        
        throw error;
      }
    },
    
    /**
     * Instrument a transaction.
     */
    async instrumentTransaction<T>(
      operation: string,
      transactionFn: () => Promise<T>
    ): Promise<T> {
      const startTime = Date.now();
      
      logger.debug(`Transaction started: ${operation}`, {
        operation: 'db_transaction_start',
        transaction: operation,
      });
      
      try {
        const result = await transactionFn();
        const durationMs = Date.now() - startTime;
        
        logger.info(`Transaction committed: ${operation}`, {
          operation: 'db_transaction_commit',
          transaction: operation,
          durationMs,
        });
        
        return result;
        
      } catch (error) {
        const durationMs = Date.now() - startTime;
        
        logger.error(`Transaction rolled back: ${operation}`, error instanceof Error ? error : undefined, {
          operation: 'db_transaction_rollback',
          transaction: operation,
          durationMs,
        });
        
        throw error;
      }
    },
    
    /**
     * Record database operation metrics.
     */
    recordOperation(
      operation: string,
      repository: string,
      durationMs: number,
      success: boolean,
      rowsAffected?: number,
      error?: NormalizedError
    ): void {
      recordDatabaseOperation(
        operation,
        repository,
        durationMs,
        success,
        {
          service: options.serviceContext.service,
          database: options.databaseName || 'default',
          ...(error && { error_code: error.code }),
        }
      );
    },
  };
}

// =============================================================================
// D1 Database Instrumentation (Cloudflare)
// =============================================================================

export interface D1InstrumentationOptions extends DatabaseInstrumentationOptions {
  database: D1Database;
}

/**
 * Create D1-specific instrumentation wrapper.
 */
export function createD1Instrumentation(options: D1InstrumentationOptions) {
  const baseInstrumentation = createDatabaseInstrumentation(options);
  
  return {
    /**
     * Instrument a D1 statement execution.
     */
    async exec<T>(
      operation: string,
      repository: string,
      statement: D1PreparedStatement
    ): Promise<D1Result> {
      return baseInstrumentation.instrumentQuery(
        operation,
        repository,
        async () => {
          const result = await statement.all();
          return result;
        }
      );
    },
    
    /**
     * Instrument a D1 batch execution.
     */
    async batch(
      operation: string,
      repository: string,
      statements: D1PreparedStatement[]
    ): Promise<D1Result[]> {
      return baseInstrumentation.instrumentQuery(
        operation,
        repository,
        async () => {
          const results = await options.database.batch(statements);
          return results;
        }
      );
    },
    
    /**
     * Instrument a D1 transaction.
     */
    async transaction<T>(
      operation: string,
      fn: (d1: D1Database) => Promise<T>
    ): Promise<T> {
      return baseInstrumentation.instrumentTransaction(operation, async () => {
        // Note: D1 doesn't support transactions in the same way
        // This is a placeholder for when D1 adds transaction support
        return fn(options.database);
      });
    },
    
    /**
     * Get the underlying database.
     */
    getDatabase(): D1Database {
      return options.database;
    },
    
    /**
     * Create an instrumented prepared statement.
     */
    prepare(sql: string): D1PreparedStatement & {
      instrumented: {
        all: () => Promise<D1Result>;
        first: () => Promise<D1Result>;
        run: () => Promise<D1Result>;
      };
    } {
      const statement = options.database.prepare(sql);
      
      return {
        ...statement,
        bind: (...args: unknown[]) => {
          const bound = statement.bind(...args);
          return {
            ...bound,
            instrumented: {
              all: () =>
                baseInstrumentation.instrumentQuery(
                  'execute',
                  'unknown',
                  () => bound.all()
                ),
              first: () =>
                baseInstrumentation.instrumentQuery(
                  'execute',
                  'unknown',
                  () => bound.first()
                ),
              run: () =>
                baseInstrumentation.instrumentQuery(
                  'execute',
                  'unknown',
                  () => bound.run()
                ),
            },
          } as D1PreparedStatement & {
            instrumented: {
              all: () => Promise<D1Result>;
              first: () => Promise<D1Result>;
              run: () => Promise<D1Result>;
            };
          };
        },
      } as D1PreparedStatement & {
        instrumented: {
          all: () => Promise<D1Result>;
          first: () => Promise<D1Result>;
          run: () => Promise<D1Result>;
        };
      };
    },
  };
}

// =============================================================================
// Error Code Inference
// =============================================================================

/**
 * Infer database error code from error.
 */
function inferDatabaseErrorCode(error: unknown): typeof ERROR_CODES[keyof typeof ERROR_CODES] {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    
    if (message.includes('timeout')) {
      return ERROR_CODES.DATABASE_TIMEOUT;
    }
    if (message.includes('unique') || message.includes('duplicate')) {
      return ERROR_CODES.DUPLICATE_ENTRY;
    }
    if (message.includes('constraint')) {
      return ERROR_CODES.DATABASE_CONSTRAINT;
    }
    if (message.includes('connection')) {
      return ERROR_CODES.DATABASE_CONNECTION;
    }
    if (message.includes('foreign key')) {
      return ERROR_CODES.DATABASE_CONSTRAINT;
    }
  }
  
  return ERROR_CODES.DATABASE_ERROR;
}

// =============================================================================
// Repository Pattern Helper
// =============================================================================

/**
 * Create an instrumented repository.
 */
export function createInstrumentedRepository<T extends object>(
  name: string,
  instrumentation: ReturnType<typeof createDatabaseInstrumentation>,
  methods: Record<string, (...args: unknown[]) => Promise<unknown>>
): T {
  const instrumented: Record<string, (...args: unknown[]) => Promise<unknown>> = {};
  
  for (const [methodName, methodFn] of Object.entries(methods)) {
    instrumented[methodName] = async (...args: unknown[]) => {
      return instrumentation.instrumentQuery(methodName, name, () =>
        methodFn(...args)
      );
    };
  }
  
  return instrumented as T;
}
