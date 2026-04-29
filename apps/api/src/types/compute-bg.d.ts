declare module '@aivo/compute/aivo_compute_bg.js' {
  export function __wbg_set_wasm(wasm: Record<string, unknown>): void;
  export function start(): void;
  // Re-export all types from the main module
  export * from '@aivo/compute';
}
