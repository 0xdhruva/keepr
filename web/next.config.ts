import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    // Disable ESLint during build (warnings won't block deployment)
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Disable TypeScript errors during build (for faster deployment)
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
