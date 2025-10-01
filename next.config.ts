import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  // Enable experimental features for better performance
  experimental: {
    optimizePackageImports: ['@radix-ui/react-icons', 'lucide-react'],
  },
  
  // TypeScript configuration
  typescript: {
    // Only ignore build errors in development
    ignoreBuildErrors: process.env.NODE_ENV === 'development',
  },
  
  // ESLint configuration
  eslint: {
    // Only ignore during builds in development
    ignoreDuringBuilds: process.env.NODE_ENV === 'development',
  },
  
  // Image optimization
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
        port: '',
        pathname: '/**',
      },
    ],
    formats: ['image/webp', 'image/avif'],
  },
  
  // Compression and optimization
  compress: true,
  
  // Security headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
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
        ],
      },
    ];
  },
  
  // Environment variables
  env: {
    NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME || 'BIA TaxiGo',
    NEXT_PUBLIC_APP_VERSION: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
  },
  
  // Webpack configuration for better bundle analysis
  webpack: (config, { dev, isServer }) => {
    if (!dev && !isServer) {
      config.optimization.splitChunks = {
        chunks: 'all',
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            chunks: 'all',
          },
        },
      };
    }
    return config;
  },
};

export default nextConfig;
