/**
 * WASM Gateway - Package Index
 * 
 * Unified export for WASM module loading and execution.
 */

export { WASMGateway, createWasmGateway, isWASMSupported, getAvailableEngines } from './gateway.js';
export type { EngineGatewayConfig, EngineType, EngineStrategy } from './gateway.js';

export * from './types.js';

export { default as wasmWorker } from './worker.js';
