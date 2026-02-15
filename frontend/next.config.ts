import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'placehold.co', port: '', pathname: '/**' },
      { protocol: 'https', hostname: 'images.unsplash.com', port: '', pathname: '/**' },
      // Firebase Storage (prod)
      { protocol: 'https', hostname: 'firebasestorage.googleapis.com', port: '', pathname: '/**' },
      { protocol: 'https', hostname: 'storage.googleapis.com', port: '', pathname: '/**' },
      { protocol: 'https', hostname: '*.appspot.com', port: '', pathname: '/**' },
      // Storage emulator (local)
      { protocol: 'http', hostname: 'localhost', port: '9199', pathname: '/**' },
      { protocol: 'http', hostname: '127.0.0.1', port: '9199', pathname: '/**' },
    ],
  },

  env: {
    NEXT_PUBLIC_FIREBASE_WEBAPP_CONFIG: process.env.FIREBASE_WEBAPP_CONFIG ?? '',
  },

  typescript: { ignoreBuildErrors: process.env.NODE_ENV === 'development' },
};

export default nextConfig;
