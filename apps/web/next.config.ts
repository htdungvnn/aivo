import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Use static export for Cloudflare Pages
  output: 'export',

  // Enable React strict mode
  reactStrictMode: true,

  // Transpile packages that need to be included in the bundle
  transpilePackages: ['@aivo/shared-types'],

  // Configure images for Cloudflare R2 and external sources
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.r2.dev' },
      { protocol: 'https', hostname: '*.cloudflare.com' },
      { protocol: 'https', hostname: '*.amazonaws.com' },
      { protocol: 'https', hostname: '*.googleusercontent.com' },
    ],
    // For static export, use unoptimized images
    unoptimized: true,
  },

  // Build output directory (for export)
  distDir: 'out',

  // TypeScript configuration
  typescript: {
    ignoreBuildErrors: false,
  },

  // Compiler optimizations
  compiler: {
    // Remove console.log in production (except warn and error)
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn', 'info'],
    } : false,
  },

  // Webpack configuration
  webpack: (config, { isServer, webpack }) => {
    // Cloudflare Pages uses Node.js 18+ with some polyfills
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }

    // Handle WASM files - ensure they are emitted as assets
    config.module.rules.push({
      test: /\.wasm$/,
      type: 'webassembly/async',
    });

    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
      syncWebAssembly: true,
    };

    // Bundle analyzer (only in development with ANALYZE env var)
    if (process.env.ANALYZE === 'true') {
      const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
      config.plugins.push(
        new BundleAnalyzerPlugin({
          analyzerMode: 'static',
          reportFilename: '../bundle-analysis.html',
          openAnalyzer: false,
        })
      );
    }

    // Provide global variables for browser
    config.plugins.push(
      new webpack.DefinePlugin({
        'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
      })
    );

    return config;
  },

  // Performance optimizations
  experimental: {
    // Optimize package imports for smaller bundles
    optimizePackageImports: [
      'lucide-react',
      'clsx',
      'tailwind-merge',
      'date-fns',
      'recharts',
    ],
  },
};

export default nextConfig;
