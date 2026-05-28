import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingRoot: __dirname, // Fixes the workspace root warning

  webpack: (config) => {
    // Fix for MetaMask SDK / React Native module issues
    config.resolve.fallback = {
      ...config.resolve.fallback,
      async_hooks: false,
    };
    return config;
  },

  // Recommended settings for web3 dApps
  reactStrictMode: true,
  swcMinify: true,
};

export default nextConfig;