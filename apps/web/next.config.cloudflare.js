module.exports = {
  // Use output: 'standalone' for Cloudflare Pages compatibility
  // This creates a standalone build that includes all dependencies
  output: 'standalone',

  // Enable React strict mode
  reactStrictMode: true,

  // Transpile packages that need to be included in the bundle
  transpilePackages: ['@aivo/shared-types', '@aivo/compute'],

  // Configure images for Cloudflare R2 and external sources
  images: {
    remotePatterns: [
      // Allow R2 bucket images
      {
        protocol: 'https',
        hostname: '*.r2.dev',
      },
      // Allow Cloudflare images
      {
        protocol: 'https',
        hostname: '*.cloudflare.com',
      },
      // Allow common image sources
      {
        protocol: 'https',
        hostname: '*.amazonaws.com',
      },
      {
        protocol: 'https',
        hostname: '*.googleusercontent.com',
      },
    ],
    // Enable responsive images
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256],
  },

  // Environment variable handling for Cloudflare Pages
  // Pages injects its own env vars, but we need to pass through our custom ones
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },

  // Build output directory (Pages uses .next/standable by default)
  distDir: '.next',

  // TypeScript configuration
  typescript: {
    // !! WARN !!
    // Dangerously allow production builds to successfully complete even if
    // your project has type errors.
    // !! WARN !!
    ignoreBuildErrors: false,
  },

  // ESLint configuration
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: false,
  },

  // Optimize CSS
  optimizeCss: true,

  // Compiler optimizations
  compiler: {
    // Remove console.log in production (except warn and error)
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn', 'info'],
    } : false,
  },

  // Webpack configuration for Cloudflare compatibility and optimization
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

    // Handle WASM files
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

  // Production optimizations
  ...(process.env.NODE_ENV === 'production' && {
    // Enable React profiler in production for performance monitoring
    reactProductionProfiler: true,

    // Generate optimized static pages where possible
    staticPageGenerationTimeout: 60,

    // Increase timeout for slow builds
    buildTimeout: 120,
  }),

  // Experimental features (use with caution)
  experimental: {
    // Optimize fonts
    optimizeFonts: true,
    // Optimize package imports for faster cold starts
    optimizePackageImports: ['lucide-react', 'clsx', 'tailwind-merge'],
    // Server actions (if used in the future)
    // serverActions: true,
  },

  // Headers for security and caching
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
      // Cache static assets
      {
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      // Cache images
      {
        source: '/_next/image/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },

  // Redirects (if needed in future)
  async redirects() {
    return [
      // Example: redirect from old route to new one
      // {
      //   source: '/old-path',
      //   destination: '/new-path',
      //   permanent: true,
      // },
    ];
  },
};
