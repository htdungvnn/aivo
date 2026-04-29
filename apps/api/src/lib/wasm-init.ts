/**
 * WASM Module Initialization
 *
 * Handles loading and initialization of the @aivo/compute WASM module
 * for Cloudflare Workers environment.
 */

const WASM_PATH = "/aivo_compute_bg.wasm";

let initialized = false;
let initPromise: Promise<void> | null = null;

/**
 * Initialize the WASM module by fetching the binary and setting up bindings.
 * Must be called before any WASM functions are used.
 */
export async function ensureWasmInitialized(): Promise<void> {
  if (initialized) {return;}

  if (!initPromise) {
    initPromise = (async () => {
      try {
        const response = await fetch(WASM_PATH);
        if (!response.ok) {
          throw new Error(`Failed to fetch WASM: ${response.status} ${response.statusText}`);
        }
        const wasmBytes = await response.arrayBuffer();
        const instance = await WebAssembly.instantiate(wasmBytes);
        // Set the WASM module for the bindings
        const { __wbg_set_wasm, start } = await import("@aivo/compute/aivo_compute_bg.js");
        __wbg_set_wasm(instance.exports);
        await start();
        initialized = true;
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error("WASM initialization failed:", error);
        throw error;
      }
    })();
  }

  await initPromise;
}

/**
 * Check if WASM is initialized.
 */
export function isWasmInitialized(): boolean {
  return initialized;
}
