'use client';

import { useEffect, useState, useCallback } from 'react';
import { useReadContract } from 'wagmi';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import piggyBankArtifact from '@/abis/PiggyBank.json';

const CONTRACT_ADDRESS = (process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || '0x5FbDB2315678afecb367f032d93F642f64180aa3') as `0x${string}`;

interface CountdownTimerProps {
  address: string;
}

export default function CountdownTimer({ address }: CountdownTimerProps) {
  const { data: unlockTimeData, refetch: refetchUnlockTime } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: piggyBankArtifact.abi,
    functionName: 'getUnlockTime',
    args: address ? [address as `0x${string}`] : undefined,
    query: {
      enabled: !!address,
    }
  });

  const unlockTimestamp = unlockTimeData ? Number(unlockTimeData) : 0;
  const [timeLeft, setTimeLeft] = useState<string>('Loading lock status...');
  const [isUnlocked, setIsUnlocked] = useState(false);

  // Keep smart contract state in sync across wallet flips
  useEffect(() => {
    if (address) {
      refetchUnlockTime();
    }
  }, [address, refetchUnlockTime]);

  // Core time calculation optimized into a reusable callback to avoid interval mounting lags
  const calculateTimeLeft = useCallback(() => {
    if (!unlockTimestamp || unlockTimestamp === 0) {
      setTimeLeft('No Lock Active');
      setIsUnlocked(false);
      return;
    }

    const now = Math.floor(Date.now() / 1000);
    const diff = unlockTimestamp - now;

    if (diff <= 0) {
      setTimeLeft('Vault Available');
      setIsUnlocked(true);
      return;
    }

    const days = Math.floor(diff / 86400);
    const hours = Math.floor((diff % 86400) / 3600);
    const minutes = Math.floor((diff % 3600) / 60);
    const seconds = Math.floor(diff % 60);

    const parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0 || days > 0) parts.push(`${hours}h`);
    parts.push(`${minutes}m`);
    parts.push(`${seconds}s`);

    setTimeLeft(parts.join(' '));
    setIsUnlocked(false);
  }, [unlockTimestamp]);

  useEffect(() => {
    // Run evaluation instantly on mount to defeat the 1-second interval execution lag
    calculateTimeLeft();

    const interval = setInterval(calculateTimeLeft, 1000);
    return () => clearInterval(interval);
  }, [calculateTimeLeft]);

  return (
    <Card className="glass-card border border-border/40 bg-card/60 backdrop-blur-xl shadow-2xl rounded-2xl overflow-hidden relative group">
      <div className="absolute -inset-px bg-gradient-to-tr from-cyan-500/10 to-emerald-500/10 opacity-0 group-hover:opacity-100 transition duration-500 rounded-2xl pointer-events-none" />
      
      <CardHeader className="pb-2">
        <CardTitle className="text-xl font-black tracking-tight text-foreground flex items-center gap-2">
          <span>⏳</span> Lock Countdown
        </CardTitle>
      </CardHeader>

      <CardContent className="text-center py-10 flex flex-col items-center justify-center min-h-[180px]">
        <AnimatePresence mode="wait">
          <motion.p 
            key={timeLeft}
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.02 }}
            transition={{ duration: 0.15 }}
            className={`text-4xl md:text-5xl font-mono font-black tracking-tight transition-colors tabular-nums ${
              unlockTimestamp === 0 
                ? 'text-muted-foreground/50'
                : isUnlocked 
                  ? 'text-emerald-400 drop-shadow-[0_0_15px_rgba(52,211,153,0.2)]' 
                  : 'text-cyan-400 drop-shadow-[0_0_15px_rgba(34,211,238,0.15)]'
            }`}
          >
            {timeLeft}
          </motion.p>
        </AnimatePresence>
        
        {unlockTimestamp > 0 && !isUnlocked && (
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-xs font-medium text-muted-foreground mt-4 bg-muted/40 border border-border/30 px-3 py-1.5 rounded-full"
          >
            Maturation Date: {new Date(unlockTimestamp * 1000).toLocaleString(undefined, {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </motion.p>
        )}
      </CardContent>
    </Card>
  );
}