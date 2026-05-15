import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // output: 'standalone', // Uncomment for Railway Docker deployments
  images: {
    domains: [],
  },
  serverExternalPackages: ['@prisma/client', 'prisma', 'pdf-lib'],
  experimental: {
    // Streaming respuestas largas de Claude
    serverActions: { bodySizeLimit: '4mb' },
  },
};

export default nextConfig;
