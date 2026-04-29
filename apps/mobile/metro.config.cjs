const { getDefaultConfig } = require('expo/metro-config');
const os = require('os');

const config = getDefaultConfig(__dirname);

// Enable optimization for production builds
config.transformer.minifierConfig = {
  compress: {
    drop_console: true,
    drop_debugger: true,
  },
  mangle: true,
};

// Optimize module resolution
config.resolver.nodeModulesPaths = [
  ...config.resolver.nodeModulesPaths,
  'node_modules',
];

// Enable inline requires for faster startup
config.transformer.inlineRequires = true;

// Increase max workers for faster builds
config.maxWorkers = os.cpus().length;

module.exports = config;
