/** @type {import('next').NextConfig} */
const nextConfig = {
  // Forces Turbopack/Next to transpile modern JS inside these specific libraries for older browsers
  transpilePackages: [
    '@rainbow-me/rainbowkit',
    'wagmi',
    'viem',
    '@adradf/lucide-react', // If any lucide icon variants use modern syntax features
  ],

  // Keep your existing Turbopack declaration active
  experimental: {
    turbo: {},
  },

  // Wallet libraries are client-only — keep out of the server bundle.
  serverExternalPackages: [],
};

module.exports = nextConfig;