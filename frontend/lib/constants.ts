import { zeroAddress } from 'viem';

// ─── Contract ────────────────────────────────────────────────────────────────
export const CONTRACT_ADDRESS = (
  process.env.NEXT_PUBLIC_CONTRACT_ADDRESS ||
  '0x5FbDB2315678afecb367f032d93F642f64180aa3'
) as `0x${string}`;

// ─── Token registry ──────────────────────────────────────────────────────────
export interface TokenMetadata {
  symbol: string;
  address: `0x${string}`;
  decimals: number;
  /** Coingecko ID for live price lookup */
  coingeckoId: string;
  color: string;
}

export const TOKEN_LIST: TokenMetadata[] = [
  {
    symbol: 'ETH',
    address: zeroAddress,
    decimals: 18,
    coingeckoId: 'ethereum',
    color: '#627EEA',
  },
  {
    symbol: 'USDC',
    address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    decimals: 6,
    coingeckoId: 'usd-coin',
    color: '#2775CA',
  },
  {
    symbol: 'USDT',
    address: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
    decimals: 6,
    coingeckoId: 'tether',
    color: '#26A17B',
  },
  {
    symbol: 'DAI',
    address: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
    decimals: 18,
    coingeckoId: 'dai',
    color: '#F5AC37',
  },
  {
    symbol: 'WBTC',
    address: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599',
    decimals: 8,
    coingeckoId: 'wrapped-bitcoin',
    color: '#F7931A',
  },
  {
    symbol: 'LINK',
    address: '0x514910771AF9Ca656af840dff83E8264EcF986CA',
    decimals: 18,
    coingeckoId: 'chainlink',
    color: '#375BD2',
  },
];

export const TOKEN_MAP = new Map(
  TOKEN_LIST.map((t) => [t.address.toLowerCase(), t]),
);

export function getTokenByAddress(addr: string): TokenMetadata | undefined {
  return TOKEN_MAP.get(addr.toLowerCase());
}

// ─── Contract constants (mirrored from Solidity) ─────────────────────────────
/** 7 days — minimum initial lock duration */
export const MIN_LOCK_DAYS = 7;
/** 1 day — minimum extension */
export const MIN_LOCK_EXTENSION_DAYS = 1;
/** 0.001 ETH — minimum emergency withdrawal amount */
export const MIN_EMERGENCY_AMOUNT_ETH = 0.001;