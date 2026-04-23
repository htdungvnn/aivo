/**
 * WASM Initialization Wrapper for Cloudflare Workers
 *
 * The wasm-pack generated code uses ES module imports for .wasm files
 * which don't work correctly in Cloudflare Workers environment.
 * This wrapper provides proper initialization.
 */

// Import the classes and init function
import {
  FitnessCalculator,
  AdaptivePlanner,
  VoiceParser,
  initSync,
} from "@aivo/compute";

// We need to fetch and initialize the WASM module manually
let wasmInitialized = false;
let initPromise: Promise<void> | null = null;

async function initWasm(): Promise<void> {
  if (wasmInitialized) {return;}
  if (initPromise) {return initPromise;}

  initPromise = (async () => {
    try {
      // Fetch the WASM module
      const wasmUrl = new URL("aivo_compute_bg.wasm", import.meta.url);
      const response = await fetch(wasmUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch WASM: ${response.status} ${response.statusText}`);
      }
      const wasmBytes = await response.arrayBuffer();

      // Initialize synchronously with the WASM bytes
      initSync(wasmBytes);

      wasmInitialized = true;
      // eslint-disable-next-line no-console
      console.log("[WASM] @aivo/compute initialized successfully");
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("[WASM] Failed to initialize @aivo/compute:", error);
      throw error;
    }
  })();

  return initPromise;
}

// Export the classes and init function
export { FitnessCalculator, AdaptivePlanner, VoiceParser, initWasm };
