/** @type {import('next').NextConfig} */
const nextConfig = {
  // Explicitly opt into Turbopack (default in Next.js 16) and silence the
  // "webpack config but no turbopack config" error.
  turbopack: {},

  // Wallet libraries are client-only — keep out of the server bundle.
  serverExternalPackages: [],
};

module.exports = nextConfig;