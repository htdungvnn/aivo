/**
 * WASM Gateway - Package Index
 * 
 * Unified export for WASM module loading and execution.
 */

export { WASMGateway, createWasmGateway, isWASMSupported, getAvailableEngines } from './index.js';
export type { EngineGatewayConfig, EngineType, EngineStrategy } from './index.js';

export { default as WASMGateway } from './index.js';

export * from './types.js';

export { default as wasmWorker } from './worker.js';
