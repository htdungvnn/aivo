/**
 * Runtime Package Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  RUNTIME_KINDS,
  ENVIRONMENT_TYPES,
  detectRuntime,
  getRuntime,
  clearRuntimeCache,
  isCloudflareWorkers,
  isNode,
  isBrowser,
  isReactNative,
  isTesting,
  detectCapabilities,
  getEnvironment,
  isWasmReliable,
  getRecommendedStorage,
} from '../src/index';

describe('Runtime Detection', () => {
  beforeEach(() => {
    clearRuntimeCache();
  });

  describe('detectRuntime', () => {
    it('should return a valid runtime context', () => {
      const runtime = detectRuntime();
      
      expect(runtime).toBeDefined();
      expect(runtime.kind).toBeDefined();
      expect(runtime.capabilities).toBeDefined();
      expect(typeof runtime.isProduction).toBe('boolean');
      expect(typeof runtime.isDevelopment).toBe('boolean');
      expect(typeof runtime.isTest).toBe('boolean');
    });

    it('should return cached result on subsequent calls', () => {
      const runtime1 = getRuntime();
      const runtime2 = getRuntime();
      
      expect(runtime1).toBe(runtime2);
    });

    it('should have valid runtime kind', () => {
      const runtime = detectRuntime();
      const validKinds = Object.values(RUNTIME_KINDS);
      
      expect(validKinds).toContain(runtime.kind);
    });
  });

  describe('isCloudflareWorkers', () => {
    it('should be a function', () => {
      expect(typeof isCloudflareWorkers).toBe('function');
    });
  });

  describe('isNode', () => {
    it('should be a function', () => {
      expect(typeof isNode).toBe('function');
    });
  });

  describe('isBrowser', () => {
    it('should be a function', () => {
      expect(typeof isBrowser).toBe('function');
    });
  });

  describe('isReactNative', () => {
    it('should be a function', () => {
      expect(typeof isReactNative).toBe('function');
    });
  });

  describe('isTesting', () => {
    it('should be a function', () => {
      expect(typeof isTesting).toBe('function');
    });
  });
});

describe('Capability Detection', () => {
  beforeEach(() => {
    clearRuntimeCache();
  });

  describe('detectCapabilities', () => {
    it('should return a capabilities object', () => {
      const capabilities = detectCapabilities();
      
      expect(capabilities).toBeDefined();
      expect(typeof capabilities.hasFetch).toBe('boolean');
      expect(typeof capabilities.hasWasm).toBe('boolean');
      expect(typeof capabilities.hasWebCrypto).toBe('boolean');
    });

    it('should have all required capability flags', () => {
      const capabilities = detectCapabilities();
      
      const requiredFlags = [
        'hasSecureStorage',
        'hasFileSystem',
        'hasLocalStorage',
        'hasCacheStorage',
        'hasFetch',
        'hasWebSocket',
        'hasServerSentEvents',
        'hasWebCrypto',
        'hasWasm',
        'hasCameraAccess',
        'hasMicrophoneAccess',
        'hasBackgroundTasks',
        'hasPushNotifications',
      ];
      
      for (const flag of requiredFlags) {
        expect(capabilities).toHaveProperty(flag);
        expect(typeof (capabilities as any)[flag]).toBe('boolean');
      }
    });
  });
});

describe('Environment Detection', () => {
  describe('getEnvironment', () => {
    it('should return a valid environment type', () => {
      const env = getEnvironment();
      const validEnvs = Object.values(ENVIRONMENT_TYPES);
      
      expect(validEnvs).toContain(env);
    });
  });

  describe('isDevelopment', () => {
    it('should be a function', () => {
      expect(typeof isDevelopment).toBe('function');
    });
  });

  describe('isProductionEnv', () => {
    it('should be a function', () => {
      expect(typeof isProductionEnv).toBe('function');
    });
  });

  describe('isStaging', () => {
    it('should be a function', () => {
      expect(typeof isStaging).toBe('function');
    });
  });
});

describe('Feature Recommendations', () => {
  beforeEach(() => {
    clearRuntimeCache();
  });

  describe('isWasmReliable', () => {
    it('should return a boolean', () => {
      const result = isWasmReliable();
      expect(typeof result).toBe('boolean');
    });
  });

  describe('getRecommendedStorage', () => {
    it('should return a valid storage type', () => {
      const storage = getRecommendedStorage();
      const validTypes = ['secure', 'local', 'file', 'memory'];
      
      expect(validTypes).toContain(storage);
    });
  });
});

describe('Constants', () => {
  describe('RUNTIME_KINDS', () => {
    it('should have all expected runtime kinds', () => {
      expect(RUNTIME_KINDS.CLOUDFLARE_WORKERS).toBe('cloudflare-workers');
      expect(RUNTIME_KINDS.NODE).toBe('node');
      expect(RUNTIME_KINDS.BROWSER).toBe('browser');
      expect(RUNTIME_KINDS.REACT_NATIVE).toBe('react-native');
      expect(RUNTIME_KINDS.SERVICE_WORKER).toBe('service-worker');
      expect(RUNTIME_KINDS.TESTING).toBe('testing');
      expect(RUNTIME_KINDS.UNKNOWN).toBe('unknown');
    });
  });

  describe('ENVIRONMENT_TYPES', () => {
    it('should have all expected environment types', () => {
      expect(ENVIRONMENT_TYPES.DEVELOPMENT).toBe('development');
      expect(ENVIRONMENT_TYPES.STAGING).toBe('staging');
      expect(ENVIRONMENT_TYPES.PRODUCTION).toBe('production');
      expect(ENVIRONMENT_TYPES.TEST).toBe('test');
    });
  });
});
