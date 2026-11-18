import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  experimental: {
    serverActions: { bodySizeLimit: '25mb' }, // hasta 20 fotos por envío
  },
  images: { unoptimized: true },
};

export default nextConfig;
