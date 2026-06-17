import { zeroAddress } from 'viem';

// ─── Contract ────────────────────────────────────────────────────────────────
export const CONTRACT_ADDRESS = (
  process.env.NEXT_PUBLIC_CONTRACT_ADDRESS ||
  '0x17667b6b6ebc042b01ba03b0fb885eef1d7ac4a4'
) as `0x${string}`;

// ─── Token Registry ──────────────────────────────────────────────────────────
export interface TokenMetadata {
  symbol: string;
  address: `0x${string}`;
  decimals: number;
  coingeckoId: string;
  color: string;
}

// REMOVED "as const" here so the addresses evaluate cleanly as standard strings
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
    address: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
    decimals: 6,
    coingeckoId: 'usd-coin',
    color: '#2775CA',
  },
  {
    symbol: 'USDT',
    address: '0xaA8E23Fb1079EA71e0a56F48a2Aa51851D8433D0',
    decimals: 6,
    coingeckoId: 'tether',
    color: '#26A17B',
  },
  {
    symbol: 'DAI',
    address: '0xFF34B3d4Aee8ddCd6F9AFFFB6Fe49bD371b8a35',
    decimals: 18,
    coingeckoId: 'dai',
    color: '#F5AC37',
  },
  {
    symbol: 'WBTC',
    address: '0x29f2D26B1e7448A338605D815531fe26FfC2c47F',
    decimals: 8,
    coingeckoId: 'wrapped-bitcoin',
    color: '#F7931A',
  },
  {
    symbol: 'LINK',
    address: '0x77987eA1284211557A402213D230154FEE22c02b',
    decimals: 18,
    coingeckoId: 'chainlink',
    color: '#375BD2',
  },
];

// ─── Utility Lookup Functions ────────────────────────────────────────────────
export function getTokenByAddress(addr: string | undefined): TokenMetadata | undefined {
  if (!addr) return undefined;
  const cleanAddr = addr.trim().toLowerCase();
  return TOKEN_LIST.find((token) => token.address.toLowerCase() === cleanAddr);
}

export function getTokenBySymbol(symbol: string | undefined): TokenMetadata | undefined {
  if (!symbol) return undefined;
  const cleanSymbol = symbol.trim().toUpperCase();
  return TOKEN_LIST.find((token) => token.symbol.toUpperCase() === cleanSymbol);
}

// ─── Contract Constants ─────────────────────────────────────────────────────
export const MIN_LOCK_DAYS = 7;
export const MIN_LOCK_EXTENSION_DAYS = 1;
export const MIN_EMERGENCY_AMOUNT_ETH = 0.001;