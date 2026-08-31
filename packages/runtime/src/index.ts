// =============================================================================
// Global Type Declarations
// =============================================================================

/**
 * Expo environment variables (available at build time)
 */
declare const __expo_env__: Record<string, string> | undefined;

/**
 * Expo runtime object
 */
declare const expo: { manifest?: Record<string, unknown> } | undefined;

// =============================================================================
// Runtime Kinds
// =============================================================================

/**
 * Supported runtime environments
 */
export const RUNTIME_KINDS = {
  CLOUDFLARE_WORKERS: 'cloudflare-workers',
  NODE: 'node',
  BROWSER: 'browser',
  REACT_NATIVE: 'react-native',
  SERVICE_WORKER: 'service-worker',
  TESTING: 'testing',
  UNKNOWN: 'unknown',
} as const;

export type RuntimeKind = (typeof RUNTIME_KINDS)[keyof typeof RUNTIME_KINDS];

// =============================================================================
// Capability Flags
// =============================================================================

/**
 * Runtime capabilities
 */
export interface RuntimeCapabilities {
  // Storage
  hasSecureStorage: boolean;      // Keychain, Keytar, etc.
  hasFileSystem: boolean;         // Node fs, or File System Access API
  hasLocalStorage: boolean;       // localStorage, AsyncStorage
  hasCacheStorage: boolean;       // Cache API
  
  // Network
  hasFetch: boolean;              // Native fetch
  hasWebSocket: boolean;          // WebSocket support
  hasServerSentEvents: boolean;    // SSE support
  
  // Crypto
  hasWebCrypto: boolean;          // SubtleCrypto API
  hasNodeCrypto: boolean;         // Node crypto module
  
  // Media
  hasCameraAccess: boolean;        // Camera API
  hasMicrophoneAccess: boolean;    // Microphone API
  hasMediaRecorder: boolean;       // MediaRecorder API
  
  // Device
  hasVibration: boolean;           // Vibration API
  hasOrientation: boolean;         // DeviceOrientation
  hasGeolocation: boolean;         // Geolocation API
  hasBluetooth: boolean;           // Web Bluetooth API
  
  // Background
  hasBackgroundTasks: boolean;      // Background Sync, Service Worker
  hasPushNotifications: boolean;    // Push API
  hasNotifications: boolean;        // Notifications API
  
  // WASM
  hasWasm: boolean;                // WebAssembly support
  hasSharedArrayBuffer: boolean;   // SharedArrayBuffer
  
  // Performance
  hasPerformanceObserver: boolean;  // PerformanceObserver
  hasIntersectionObserver: boolean; // IntersectionObserver
  
  // Workers
  hasWebWorkers: boolean;          // Web Workers
  hasWorkerThreads: boolean;        // Node Worker Threads
  
  // AI
  hasWebGL: boolean;               // WebGL (for AI inference)
  hasWebGPU: boolean;              // WebGPU (for AI inference)
}

// =============================================================================
// Runtime Context
// =============================================================================

/**
 * Runtime context with detected kind and capabilities
 */
export interface RuntimeContext {
  kind: RuntimeKind;
  capabilities: RuntimeCapabilities;
  version?: string;
  isProduction: boolean;
  isDevelopment: boolean;
  isTest: boolean;
}

// =============================================================================
// Detection Logic
// =============================================================================

/**
 * Check if we're in a Cloudflare Worker environment
 */
export function isCloudflareWorkers(): boolean {
  // Check for Workers global scope
  if (typeof globalThis !== 'undefined' && 'RTCPeerConnection' in globalThis) {
    // Workers have RTCPeerConnection but not full WebRTC
    if (typeof navigator === 'undefined' && typeof document === 'undefined') {
      return true;
    }
  }
  
  // Check for Workers specific APIs
  if (typeof globalThis !== 'undefined' && 'caches' in globalThis) {
    return true;
  }
  
  return false;
}

/**
 * Check if we're in Node.js
 */
export function isNode(): boolean {
  if (typeof process !== 'undefined' && 
      process.versions?.node && 
      typeof window === 'undefined' &&
      typeof globalThis !== 'undefined') {
    return true;
  }
  return false;
}

/**
 * Check if we're in a browser
 */
export function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof document !== 'undefined';
}

/**
 * Check if we're in React Native
 */
export function isReactNative(): boolean {
  // React Native detection
  if (typeof navigator !== 'undefined' && 
      typeof navigator.product !== 'undefined' &&
      navigator.product === 'ReactNative') {
    return true;
  }
  
  return false;
}

/**
 * Check if we're in Expo
 */
export function isExpo(): boolean {
  // Check for Expo constants
  if (typeof navigator !== 'undefined' && 
      typeof (navigator as any).platform !== 'undefined') {
    // Expo typically sets platform to 'ios' or 'android' in RN
    const platform = (navigator as any).platform;
    if (platform === 'ios' || platform === 'android') {
      // Further check for Expo-specific globals
      if (typeof __expo_env__ !== 'undefined' || 
          typeof expo !== 'undefined') {
        return true;
      }
    }
  }
  
  return false;
}

/**
 * Check if we're in a service worker
 */
export function isServiceWorker(): boolean {
  return typeof window === 'undefined' && 
         typeof self !== 'undefined' && 
         'ServiceWorkerGlobalScope' in globalThis;
}

/**
 * Check if we're in a test environment
 */
export function isTesting(): boolean {
  // Jest
  if (typeof process !== 'undefined' && process.env?.JEST_WORKER_ID !== undefined) {
    return true;
  }
  
  // Vitest
  if (typeof import.meta !== 'undefined' && (import.meta as any).vitest) {
    return true;
  }
  
  // Mocha
  if (typeof window !== 'undefined' && (window as any).mocha !== undefined) {
    return true;
  }
  
  return false;
}

// =============================================================================
// Capability Detection
// =============================================================================

/**
 * Detect runtime capabilities
 */
export function detectCapabilities(): RuntimeCapabilities {
  const isWorker = isCloudflareWorkers();
  const isNodeEnv = isNode();
  const isBrowserEnv = isBrowser();
  
  // Base capabilities (always available in our supported environments)
  const baseCapabilities: RuntimeCapabilities = {
    hasSecureStorage: false,
    hasFileSystem: isNodeEnv,
    hasLocalStorage: isBrowserEnv,
    hasCacheStorage: isWorker || isBrowserEnv,
    hasFetch: typeof fetch !== 'undefined',
    hasWebSocket: typeof WebSocket !== 'undefined',
    hasServerSentEvents: typeof EventSource !== 'undefined',
    hasWebCrypto: typeof crypto !== 'undefined' && typeof crypto.subtle !== 'undefined',
    hasNodeCrypto: isNodeEnv && typeof require !== 'undefined' && !!require('crypto'),
    hasCameraAccess: isBrowserEnv,
    hasMicrophoneAccess: isBrowserEnv,
    hasMediaRecorder: typeof MediaRecorder !== 'undefined',
    hasVibration: typeof navigator !== 'undefined' && 'vibrate' in navigator,
    hasOrientation: typeof DeviceOrientationEvent !== 'undefined',
    hasGeolocation: typeof navigator !== 'undefined' && 'geolocation' in navigator,
    hasBluetooth: typeof navigator !== 'undefined' && 'bluetooth' in navigator,
    hasBackgroundTasks: isWorker || isServiceWorker(),
    hasPushNotifications: typeof PushManager !== 'undefined',
    hasNotifications: typeof Notification !== 'undefined',
    hasWasm: typeof WebAssembly !== 'undefined' && typeof WebAssembly.instantiate !== 'undefined',
    hasSharedArrayBuffer: typeof SharedArrayBuffer !== 'undefined',
    hasPerformanceObserver: typeof PerformanceObserver !== 'undefined',
    hasIntersectionObserver: typeof IntersectionObserver !== 'undefined',
    hasWebWorkers: typeof Worker !== 'undefined',
    hasWorkerThreads: isNodeEnv,
    hasWebGL: typeof WebGLRenderingContext !== 'undefined',
    hasWebGPU: typeof navigator !== 'undefined' && 'gpu' in navigator,
  };

  // Cloudflare Workers specific
  if (isWorker) {
    return {
      ...baseCapabilities,
      hasSecureStorage: false,      // Workers don't have Keychain
      hasFileSystem: false,         // Workers don't have Node fs
      hasLocalStorage: false,       // Workers don't have localStorage
      hasCameraAccess: false,
      hasMicrophoneAccess: false,
      hasVibration: false,
      hasOrientation: false,
      hasGeolocation: false,
      hasNotifications: false,
      hasWebGL: false,
      hasWebGPU: false,
    };
  }

  // React Native specific
  if (isReactNative()) {
    return {
      ...baseCapabilities,
      hasSecureStorage: true,        // Expo SecureStore
      hasFileSystem: true,          // Expo FileSystem
      hasLocalStorage: false,        // AsyncStorage instead
      hasCacheStorage: false,        // No Cache API in RN
      hasWebSocket: true,            // React Native has WebSocket
      hasWebCrypto: false,           // Limited crypto
      hasNodeCrypto: false,
      hasCameraAccess: true,         // Expo Camera
      hasMicrophoneAccess: true,     // Expo Audio
      hasMediaRecorder: false,
      hasVibration: true,
      hasOrientation: true,
      hasGeolocation: true,          // Expo Location
      hasBackgroundTasks: true,      // Expo Background Tasks
      hasNotifications: true,        // Expo Notifications
      hasWasm: true,                 // Hermes supports Wasm
      hasWebWorkers: false,          // No Web Workers in RN
      hasWebGL: true,                // Hermes has WebGL
      hasWebGPU: false,
    };
  }

  // Node.js specific
  if (isNodeEnv) {
    return {
      ...baseCapabilities,
      hasSecureStorage: true,        // keytar
      hasFileSystem: true,
      hasLocalStorage: false,
      hasCameraAccess: false,
      hasMicrophoneAccess: false,
      hasVibration: false,
      hasOrientation: false,
      hasGeolocation: false,
      hasNotifications: false,
      hasWebGPU: false,
    };
  }

  // Browser specific
  if (isBrowserEnv) {
    return {
      ...baseCapabilities,
      hasSecureStorage: true,        // Keychain on macOS, Credential Management API
      hasFileSystem: 'showOpenFilePicker' in globalThis,
      hasLocalStorage: true,
    };
  }

  return baseCapabilities;
}

// =============================================================================
// Main Detection Function
// =============================================================================

/**
 * Detect current runtime context
 */
export function detectRuntime(): RuntimeContext {
  const isWorker = isCloudflareWorkers();
  const isNodeEnv = isNode();
  const isBrowserEnv = isBrowser();
  const isRN = isReactNative();
  const isSW = isServiceWorker();
  const isTest = isTesting();
  
  let kind: RuntimeKind;
  
  if (isWorker) {
    kind = RUNTIME_KINDS.CLOUDFLARE_WORKERS;
  } else if (isNodeEnv) {
    kind = RUNTIME_KINDS.NODE;
  } else if (isRN) {
    kind = RUNTIME_KINDS.REACT_NATIVE;
  } else if (isBrowserEnv) {
    kind = RUNTIME_KINDS.BROWSER;
  } else if (isSW) {
    kind = RUNTIME_KINDS.SERVICE_WORKER;
  } else if (isTest) {
    kind = RUNTIME_KINDS.TESTING;
  } else {
    kind = RUNTIME_KINDS.UNKNOWN;
  }
  
  const isProduction = typeof process !== 'undefined' 
    ? process.env?.NODE_ENV === 'production'
    : typeof import.meta !== 'undefined' 
      ? (import.meta as any).env?.PROD === true
      : false;
      
  const isDevelopment = typeof process !== 'undefined'
    ? process.env?.NODE_ENV === 'development'
    : typeof import.meta !== 'undefined'
      ? (import.meta as any).env?.DEV === true
      : true;
  
  return {
    kind,
    capabilities: detectCapabilities(),
    isProduction,
    isDevelopment,
    isTest,
  };
}

// =============================================================================
// Singleton Cache
// =============================================================================

let cachedRuntime: RuntimeContext | null = null;

/**
 * Get cached runtime context (recommended for repeated use)
 */
export function getRuntime(): RuntimeContext {
  if (!cachedRuntime) {
    cachedRuntime = detectRuntime();
  }
  return cachedRuntime;
}

/**
 * Clear runtime cache (mainly for testing)
 */
export function clearRuntimeCache(): void {
  cachedRuntime = null;
}

// =============================================================================
// Conditional Imports
// =============================================================================

/**
 * Import a module conditionally based on runtime
 */
export async function importForRuntime<T>(
  modules: Partial<Record<RuntimeKind, () => Promise<T>>>
): Promise<T> {
  const runtime = getRuntime();
  const loader = modules[runtime.kind] ?? modules[RUNTIME_KINDS.UNKNOWN];
  
  if (!loader) {
    throw new Error(`No module available for runtime: ${runtime.kind}`);
  }
  
  return loader();
}

// =============================================================================
// Environment Detection
// =============================================================================

/**
 * Environment type
 */
export const ENVIRONMENT_TYPES = {
  DEVELOPMENT: 'development',
  STAGING: 'staging',
  PRODUCTION: 'production',
  TEST: 'test',
} as const;

export type EnvironmentType = (typeof ENVIRONMENT_TYPES)[keyof typeof ENVIRONMENT_TYPES];

/**
 * Detect current environment
 */
export function getEnvironment(): EnvironmentType {
  // Check for explicit environment variable
  if (typeof process !== 'undefined' && process.env?.AIVO_ENV) {
    const env = process.env.AIVO_ENV as EnvironmentType;
    if (Object.values(ENVIRONMENT_TYPES).includes(env)) {
      return env;
    }
  }
  
  // Check NODE_ENV
  if (typeof process !== 'undefined' && process.env?.NODE_ENV) {
    return process.env.NODE_ENV as EnvironmentType;
  }
  
  // Check import.meta.env (Vite, etc.)
  if (typeof import.meta !== 'undefined') {
    const env = (import.meta as any).env;
    if (env?.PROD) return ENVIRONMENT_TYPES.PRODUCTION;
    if (env?.DEV) return ENVIRONMENT_TYPES.DEVELOPMENT;
    if (env?.TEST) return ENVIRONMENT_TYPES.TEST;
  }
  
  // Default based on hostname
  if (typeof window !== 'undefined' && window.location?.hostname) {
    const hostname = window.location.hostname;
    if (hostname.includes('staging') || hostname.includes('preprod')) {
      return ENVIRONMENT_TYPES.STAGING;
    }
    if (hostname.includes('localhost') || hostname.includes('127.0.0.1')) {
      return ENVIRONMENT_TYPES.DEVELOPMENT;
    }
  }
  
  return ENVIRONMENT_TYPES.PRODUCTION;
}

/**
 * Check if running in development
 */
export function isDevelopment(): boolean {
  return getEnvironment() === ENVIRONMENT_TYPES.DEVELOPMENT;
}

/**
 * Check if running in production
 */
export function isProductionEnv(): boolean {
  return getEnvironment() === ENVIRONMENT_TYPES.PRODUCTION;
}

/**
 * Check if running in staging
 */
export function isStaging(): boolean {
  return getEnvironment() === ENVIRONMENT_TYPES.STAGING;
}

// =============================================================================
// Feature Flags per Runtime
// =============================================================================

/**
 * Check if WASM is reliably available for the current runtime
 */
export function isWasmReliable(): boolean {
  const runtime = getRuntime();
  
  // WASM is reliable in Workers, Node, and modern browsers
  if (runtime.kind === RUNTIME_KINDS.CLOUDFLARE_WORKERS) {
    return runtime.capabilities.hasWasm;
  }
  
  if (runtime.kind === RUNTIME_KINDS.NODE) {
    return runtime.capabilities.hasWasm;
  }
  
  if (runtime.kind === RUNTIME_KINDS.BROWSER) {
    // Browser WASM is reliable if SharedArrayBuffer is available (requires COOP/COEP)
    return runtime.capabilities.hasWasm;
  }
  
  if (runtime.kind === RUNTIME_KINDS.REACT_NATIVE) {
    // React Native (Hermes) supports WASM
    return runtime.capabilities.hasWasm;
  }
  
  return false;
}

/**
 * Get recommended storage adapter for current runtime
 */
export function getRecommendedStorage(): 'secure' | 'local' | 'file' | 'memory' {
  const runtime = getRuntime();
  
  if (runtime.capabilities.hasSecureStorage) {
    return 'secure';
  }
  
  if (runtime.capabilities.hasLocalStorage) {
    return 'local';
  }
  
  if (runtime.capabilities.hasFileSystem) {
    return 'file';
  }
  
  return 'memory';
}

// =============================================================================
// Export Types
// =============================================================================
