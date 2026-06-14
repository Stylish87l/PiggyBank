'use client';

import { formatEther, zeroAddress } from 'viem';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp, Wifi, WifiOff } from 'lucide-react';
import { useVaultData } from '@/lib/useVaultData';
import { useLivePrices } from '@/lib/useLivePrices';
import { getTokenByAddress } from '@/lib/constants';

interface AssetOverviewProps {
  address: `0x${string}`;
}

export default function AssetOverview({ address }: AssetOverviewProps) {
  const { ethBalance, activeAssets, isLoading } = useVaultData(address);
  const { toUsd, isStale } = useLivePrices();

  const ethAmount = parseFloat(formatEther(ethBalance));
  const ethUsd = toUsd('ethereum', ethAmount);

  const formattedEth = ethAmount.toLocaleString(undefined, { minimumFractionDigits: 4, maximumFractionDigits: 6 });
  const formattedUsd = ethUsd.toLocaleString(undefined, { style: 'currency', currency: 'USD', minimumFractionDigits: 2 });

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
      className="w-full"
    >
      <Card className="glass-card lightning-edge card-hover border-[var(--border)] rounded-2xl overflow-hidden relative">
        {/* Ambient orb */}
        <div className="card-orb w-40 h-40 -top-10 -right-10 bg-purple-500/15" />

        <CardHeader className="pb-2 pt-5 px-5 relative z-10">
          <CardTitle className="font-display text-lg font-bold tracking-tight text-[var(--foreground)] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-purple-500/15 flex items-center justify-center">
                <TrendingUp className="w-3.5 h-3.5 text-purple-400" />
              </div>
              Total Portfolio
            </div>
            <span className={`flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full border ${
              isStale
                ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
            }`}>
              {isStale ? <WifiOff className="w-2.5 h-2.5" /> : <span className="live-dot" />}
              {isStale ? 'CACHED' : 'LIVE'}
            </span>
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-4 px-5 pb-5 relative z-10">
          <div className="py-2">
            <p className="text-xs font-semibold uppercase tracking-widest text-[var(--muted-foreground)]">
              Total Value Locked
            </p>
            {isLoading ? (
              <div className="mt-2 space-y-2">
                <Skeleton className="h-10 w-44 rounded-lg" />
                <Skeleton className="h-5 w-24 rounded-md" />
              </div>
            ) : (
              <>
                <p className="text-4xl font-display font-extrabold tracking-tight mt-1.5 text-[var(--foreground)] tabular-nums">
                  {formattedEth}{' '}
                  <span style={{
                    background: 'linear-gradient(135deg, #9333ea, #818cf8)',
                    WebkitBackgroundClip: 'text', backgroundClip: 'text', WebkitTextFillColor: 'transparent',
                  }} className="text-lg font-bold">
                    ETH
                  </span>
                </p>
                <p className="text-base font-bold text-emerald-400 mt-0.5 tabular-nums font-mono">{formattedUsd}</p>
              </>
            )}
          </div>

          <div className="pt-3 border-t border-[var(--border)] space-y-2.5">
            <div className="flex items-center justify-between">
              <Badge variant="secondary" className="font-bold tracking-wide text-[10px] bg-purple-500/10 text-purple-400 border border-purple-500/20 px-2.5">
                Multi-Asset Enabled
              </Badge>
              {activeAssets.length > 0 && (
                <span className="text-xs text-[var(--muted-foreground)] font-medium">
                  {activeAssets.length} asset{activeAssets.length !== 1 ? 's' : ''} held
                </span>
              )}
            </div>

            <AssetRow symbol="ETH" icon="Ξ" iconBg="from-purple-600 to-indigo-500" amount={formattedEth} usdValue={formattedUsd} isLoading={isLoading} />

            {activeAssets
              .filter((a) => a.toLowerCase() !== zeroAddress.toLowerCase())
              .map((assetAddr) => {
                const token = getTokenByAddress(assetAddr);
                return (
                  <AssetRow key={assetAddr} symbol={token?.symbol ?? 'ERC-20'} icon={token?.symbol.slice(0, 1) ?? '?'} iconBg="from-slate-500 to-slate-400" amount="—" usdValue="—" isLoading={false} />
                );
              })}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function AssetRow({ symbol, icon, iconBg, amount, usdValue, isLoading }: {
  symbol: string; icon: string; iconBg: string; amount: string; usdValue: string; isLoading: boolean;
}) {
  return (
    <div className="bg-[var(--muted)] border border-[var(--border)] rounded-xl p-3 flex items-center gap-3 hover:border-purple-500/30 transition-colors">
      <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${iconBg} flex items-center justify-center text-base font-black text-white shadow-md shrink-0`}>
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-[var(--foreground)]">{symbol}</p>
        {isLoading
          ? <Skeleton className="h-3 w-28 mt-1 rounded" />
          : <p className="text-xs text-[var(--muted-foreground)] font-mono tabular-nums">{amount} <span className="opacity-50">≈ {usdValue}</span></p>
        }
      </div>
    </div>
  );
}