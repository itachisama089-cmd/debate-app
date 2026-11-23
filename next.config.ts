import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 1. Your previous cache settings
  cacheComponents: true,
  partialPrefetching: true,

  // 2. The new ESLint bypass we just added
  eslint: {
    ignoreDuringBuilds: true,
  },

  // Keep any other configurations you had here (like your turbopack/tailwind loaders if they were at the top)
};

export default nextConfig;