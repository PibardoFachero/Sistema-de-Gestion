import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  compiler: {
    removeConsole:
      process.env.NODE_ENV === 'production'
        ? {
            exclude: ['error'],
          }
        : false,
  },
};

export default nextConfig;
