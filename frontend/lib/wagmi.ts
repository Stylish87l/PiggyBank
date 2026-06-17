import { http, createConfig } from 'wagmi';
import { mainnet, sepolia, base } from 'wagmi/chains';
import { getDefaultConfig } from '@rainbow-me/rainbowkit';

const PROJECT_ID =
  process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ||
  'cff1ab83cff7dbfd5818a4d33bc11d69';

export const config = getDefaultConfig({
  appName: 'PiggyBank',
  projectId: PROJECT_ID,
  // Placing Sepolia first makes it the default fallback network when your wallet connects
  chains: [sepolia, base, mainnet],
  transports: {
    // Fixed: Standardizing fallback to ensure Wagmi falls back to a public RPC if env is missing
    [sepolia.id]: http(process.env.NEXT_PUBLIC_RPC_SEPOLIA || undefined),
    [base.id]: http(process.env.NEXT_PUBLIC_RPC_BASE || undefined),
    [mainnet.id]: http(process.env.NEXT_PUBLIC_RPC_MAINNET || undefined),
  },
  ssr: true,
});