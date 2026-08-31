/**
 * Correlation Module
 * 
 * Wrapper exports for backward compatibility.
 * Use the context module directly.
 */

export {
  generateCorrelationId,
  generateTraceId,
  generateSpanId,
  generateTraceparent,
  parseTraceparent,
  isValidCorrelationId,
  isValidTraceId,
  isValidSpanId,
  sanitizeTraceContext,
  createCorrelationContext,
  extractTraceContext,
  extractCorrelationId,
  injectTraceContext,
  injectCorrelationId,
  getCurrentContext,
  setCurrentContext,
  clearCurrentContext,
  withCorrelationContext,
  withChildContext,
  withTraceFromHeaders,
} from './context.js';

export type { CorrelationContext, TraceContext } from './types.js';
