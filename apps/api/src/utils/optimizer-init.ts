/**
 * WASM Initialization Wrapper for optimizer package (Cloudflare Workers)
 */

import { initSync as optimizerInitSync } from "@aivo/optimizer";

let optimizerInitialized = false;
let initPromise: Promise<void> | null = null;

async function initOptimizer(): Promise<void> {
  if (optimizerInitialized) {return;}
  if (initPromise) {return initPromise;}

  initPromise = (async () => {
    try {
      const wasmUrl = new URL("aivo_optimizer_bg.wasm", import.meta.url);
      const response = await fetch(wasmUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch optimizer WASM: ${response.status} ${response.statusText}`);
      }
      const wasmBytes = await response.arrayBuffer();

      optimizerInitSync(wasmBytes);

      optimizerInitialized = true;
      // eslint-disable-next-line no-console
      console.log("[WASM] @aivo/optimizer initialized successfully");
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("[WASM] Failed to initialize @aivo/optimizer:", error);
      throw error;
    }
  })();

  return initPromise;
}

export { initOptimizer };
