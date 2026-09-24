/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  // Bundle optimization
  experimental: {
    optimizePackageImports: ['lucide-react', '@radix-ui/react-icons'],
    outputFileTracingIncludes: {
      '/**': ['./prisma/**', './public/uploads/**'],
    },
  },
  // Webpack optimizations
  webpack: (config, { isServer, dev }) => {
    // Reduce bundle size for client-side
    if (!isServer) {
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          ...config.optimization.splitChunks,
          chunks: 'all',
          cacheGroups: {
            ...config.optimization.splitChunks.cacheGroups,
            // Separate heavy AI libraries
            tensorflow: {
              test: /[\\/]node_modules[\\/]@tensorflow[\\/]/,
              name: 'tensorflow',
              priority: 30,
              chunks: 'all',
            },
            // Separate PDF generation
            pdf: {
              test: /[\\/]node_modules[\\/]@react-pdf[\\/]/,
              name: 'pdf',
              priority: 30,
              chunks: 'all',
            },
            // Separate Radix UI
            radix: {
              test: /[\\/]node_modules[\\/]@radix-ui[\\/]/,
              name: 'radix',
              priority: 20,
              chunks: 'all',
            },
            // Vendor chunk for other node_modules
            vendor: {
              test: /[\\/]node_modules[\\/]/,
              name: 'vendors',
              priority: 10,
              chunks: 'all',
            },
          },
        },
      }
    }
    return config
  },
  // Headers for security
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
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=*, microphone=(), geolocation=()',
          },
        ],
      },
    ]
  },
}

module.exports = nextConfig