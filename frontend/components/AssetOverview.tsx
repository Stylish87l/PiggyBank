'use client';

import { useEffect } from 'react';
import { useReadContract } from 'wagmi';
import { formatEther, zeroAddress } from 'viem';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import piggyBankArtifact from '@/abis/PiggyBank.json';

// Pulled securely from your root .env.local file
const CONTRACT_ADDRESS = (process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || '0x5FbDB2315678afecb367f032d93F642f64180aa3') as `0x${string}`;

interface AssetOverviewProps {
  address: string;
}

export default function AssetOverview({ address }: AssetOverviewProps) {
  // Wagmi v2 contract read hook with explicit query execution conditional checks
  const { data: ethBalance, refetch: refetchBalance } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: piggyBankArtifact.abi,
    functionName: 'getBalance',
    args: address ? [address as `0x${string}`, zeroAddress] : undefined,
    query: {
      enabled: !!address, // Prevent running queries against undefined addresses
    }
  });

  // Re-fetch user contract state whenever their wallet context changes
  useEffect(() => {
    if (address) {
      refetchBalance();
    }
  }, [address, refetchBalance]);

  // Safe big-integer format fallback string parsing
  const eth = ethBalance ? formatEther(ethBalance as bigint) : '0.00';
  
  // Dynamic mock calculation representing asset standard fiat evaluation conversion
  const usdValue = (parseFloat(eth) * 2450).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }} 
      animate={{ opacity: 1, y: 0 }} 
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="w-full"
    >
      <Card className="glass-card border border-border/40 bg-card/60 backdrop-blur-xl shadow-2xl rounded-2xl overflow-hidden relative group">
        {/* Modern decorative accent gradient glow layer */}
        <div className="absolute -inset-px bg-gradient-to-tr from-purple-500/10 to-indigo-500/10 opacity-0 group-hover:opacity-100 transition duration-500 rounded-2xl pointer-events-none" />
        
        <CardHeader className="pb-4">
          <CardTitle className="text-xl font-black tracking-tight text-foreground flex items-center gap-2">
            <span>📊</span> Total Portfolio
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-6">
          <div>
            <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">Total Value Locked</p>
            <p className="text-5xl font-black tracking-tighter mt-2 text-foreground truncate">
              {eth} <span className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-indigo-400 bg-clip-text text-transparent">ETH</span>
            </p>
            <p className="text-xl font-bold text-emerald-400 mt-1">${usdValue}</p>
          </div>

          <div className="pt-6 border-t border-border/40">
            <Badge variant="secondary" className="mb-4 font-bold tracking-wide bg-purple-500/10 text-purple-400 border border-purple-500/20">
              Multi-Asset Enabled
            </Badge>
            
            <div className="bg-muted/40 border border-border/20 rounded-xl p-4 transition-all hover:bg-muted/60">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-600 to-indigo-500 flex items-center justify-center text-2xl font-black text-white shadow-md shadow-purple-500/10 select-none">
                  Ξ
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-base font-bold text-foreground">Ethereum</p>
                  <p className="text-sm text-muted-foreground truncate">
                    {eth} ETH <span className="text-xs text-muted-foreground/60">≈ ${usdValue}</span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}