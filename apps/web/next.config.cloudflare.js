module.exports = {
  // Use output: 'standalone' for Cloudflare Pages compatibility
  // This creates a standalone build that includes all dependencies
  output: 'standalone',

  // Enable React strict mode
  reactStrictMode: true,

  // Transpile packages that need to be included in the bundle
  transpilePackages: ['@aivo/shared-types', '@aivo/compute'],

  // Configure images for Cloudflare R2
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
    ],
  },

  // Environment variable handling for Cloudflare Pages
  // Pages injects its own env vars, but we need to pass through our custom ones
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },

  // Build output directory (Pages uses .next/standable by default)
  distDir: '.next',

  // Generate standalone package for easier deployment
  // This is useful for Docker/Node deployments
  // For Pages, the build output is automatically detected

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

  // Webpack configuration for Cloudflare compatibility
  webpack: (config, { isServer }) => {
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

    return config;
  },
};
