// Mock for expo-modules-core
const mockExpoModulesCore = {
  // ExpoModulesCore class
  ExpoModulesCore: class {
    static shared = new this();
    async run(mod, method, args) {
      return null;
    }
  },
  // NativeModules wrapper
  NativeModules: {
    ExpoModulesCore: {
      run: () => Promise.resolve(null),
    },
  },
  // EventEmitter
  EventEmitter: class {
    constructor() {
      this.listeners = {};
    }
    addListener(event, listener) {
      if (!this.listeners[event]) this.listeners[event] = [];
      this.listeners[event].push(listener);
    }
    removeListener(event, listener) {
      if (this.listeners[event]) {
        this.listeners[event] = this.listeners[event].filter(l => l !== listener);
      }
    }
    emit(event, ...args) {
      if (this.listeners[event]) {
        this.listeners[event].forEach(l => l(...args));
      }
    }
  },
  // NativeModule
  NativeModule: class {
    constructor(name) {
      this.name = name;
    }
  },
  // SharedObject
  SharedObject: class {
    constructor(value) {
      this._value = value;
    }
    get() { return this._value; }
    set(value) { this._value = value; }
  },
  // SharedRef
  SharedRef: class {
    constructor(value) {
      this._value = value;
    }
    get() { return this._value; }
    set(value) { this._value = value; }
  },
  // uuid
  uuid: {
    v4: () => 'uuid-v4',
    v5: () => 'uuid-v5',
  },
  // requireNativeModule stub
  requireNativeModule: (name) => ({}),
};

// Set globalThis.expo as the real module does
globalThis.expo = {
  EventEmitter: mockExpoModulesCore.EventEmitter,
  NativeModule: mockExpoModulesCore.NativeModule,
  SharedObject: mockExpoModulesCore.SharedObject,
  // Include other expo namespace properties that might be used
  ...mockExpoModulesCore,
};

module.exports = mockExpoModulesCore;
module.exports.EventEmitter = mockExpoModulesCore.EventEmitter;
module.exports.SharedObject = mockExpoModulesCore.SharedObject;
module.exports.SharedRef = mockExpoModulesCore.SharedRef;
module.exports.ExpoModulesCore = mockExpoModulesCore.ExpoModulesCore;
