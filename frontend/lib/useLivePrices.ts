'use client';

import { useState, useEffect, useCallback } from 'react';
import { TOKEN_LIST } from'@/lib/constants';

type PriceMap = Record<string, number>;

const FALLBACK_PRICES: PriceMap = {
  ethereum: 3200,
  'usd-coin': 1,
  tether: 1,
  dai: 1,
  'wrapped-bitcoin': 65000,
  chainlink: 14,
};

const CACHE_TTL_MS = 60_000; // refresh every 60 s
let cachedPrices: PriceMap | null = null;
let cacheTimestamp = 0;

export function useLivePrices() {
  const [prices, setPrices] = useState<PriceMap>(FALLBACK_PRICES);
  const [isStale, setIsStale] = useState(true);

  const fetchPrices = useCallback(async () => {
    const now = Date.now();
    if (cachedPrices && now - cacheTimestamp < CACHE_TTL_MS) {
      setPrices(cachedPrices);
      setIsStale(false);
      return;
    }

    const ids = TOKEN_LIST.map((t) => t.coingeckoId).join(',');
    try {
      const res = await fetch(
        `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd`,
        { next: { revalidate: 60 } },
      );
      if (!res.ok) throw new Error('price fetch failed');
      const data = await res.json();

      const map: PriceMap = {};
      for (const id of Object.keys(data)) {
        map[id] = data[id]?.usd ?? FALLBACK_PRICES[id] ?? 0;
      }

      cachedPrices = map;
      cacheTimestamp = now;
      setPrices(map);
      setIsStale(false);
    } catch {
      // Silently fall back — never crash the UI over price data
      setPrices(FALLBACK_PRICES);
      setIsStale(true);
    }
  }, []);

  useEffect(() => {
    fetchPrices();
    const interval = setInterval(fetchPrices, CACHE_TTL_MS);
    return () => clearInterval(interval);
  }, [fetchPrices]);

  /** Returns USD value for a given coingeckoId + amount */
  function toUsd(coingeckoId: string, amount: number): number {
    return (prices[coingeckoId] ?? 0) * amount;
  }

  return { prices, isStale, toUsd };
}