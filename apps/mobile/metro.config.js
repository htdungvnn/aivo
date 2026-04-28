import { getDefaultConfig } from 'expo/metro-config';

const config = getDefaultConfig(__dirname);

// Enable optimization for production builds
config.transformer.minifierConfig = {
  keep_classnames: false,
  keep_fnames: false,
  mangle: {
    keep_fnames: false,
    keep_classnames: false,
  },
  // Enable dead code elimination
  dead_code: true,
  // Compress outputs
  compress: {
    drop_console: true,
    drop_debugger: true,
  },
};

// Optimize module resolution
config.resolver.nodeModulesPaths = [
  ...config.resolver.nodeModulesPaths,
  'node_modules',
];

// Enable inline requires for faster startup
config.transformer.inlineRequires = true;

// Increase max workers for faster builds
config.maxWorkers = require('os').cpus().length;

export default config;
