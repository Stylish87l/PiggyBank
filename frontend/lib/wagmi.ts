import { http } from 'wagmi';
import { mainnet, sepolia, base } from 'wagmi/chains';
import { getDefaultConfig } from '@rainbow-me/rainbowkit';

// Cleanly pulls your keys from your environment variables, falling back to your test key
const PROJECT_ID = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'cff1ab83cff7dbfd5818a4d33bc11d69';

export const config = getDefaultConfig({
  appName: 'PiggyBank',
  projectId: PROJECT_ID,
  chains: [sepolia, base, mainnet],
  transports: {
    /* Optimized Fallbacks: Looks for your dedicated node endpoints first.
       If none are provided in your .env file, it safely falls back to standard public endpoints.
    */
    [sepolia.id]: http(process.env.NEXT_PUBLIC_RPC_SEPOLIA),
    [base.id]: http(process.env.NEXT_PUBLIC_RPC_BASE),
    [mainnet.id]: http(process.env.NEXT_PUBLIC_RPC_MAINNET),
  },
  ssr: true, // Crucial for layout matching in Next.js App Router architectures
});