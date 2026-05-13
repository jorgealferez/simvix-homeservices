import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Enable static exports if needed
  // output: 'standalone', // Uncomment for Railway Docker deployments
  images: {
    // Add domains if using external images
    domains: [],
  },
};

export default nextConfig;
