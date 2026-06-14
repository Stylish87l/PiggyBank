'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Lock, LockOpen, Timer } from 'lucide-react';
import { useVaultData } from '@/lib/useVaultData';

interface CountdownTimerProps {
  address: `0x${string}`;
}

function getTimeComponents(diffSeconds: number) {
  return {
    days: Math.floor(diffSeconds / 86400),
    hours: Math.floor((diffSeconds % 86400) / 3600),
    minutes: Math.floor((diffSeconds % 3600) / 60),
    seconds: Math.floor(diffSeconds % 60),
  };
}

function pad(n: number) { return String(n).padStart(2, '0'); }

export default function CountdownTimer({ address }: CountdownTimerProps) {
  const { unlockTime, isLocked, hasLock } = useVaultData(address);
  const [diff, setDiff] = useState(0);

  const tick = useCallback(() => {
    if (!unlockTime) { setDiff(0); return; }
    setDiff(Math.max(0, unlockTime - Math.floor(Date.now() / 1000)));
  }, [unlockTime]);

  useEffect(() => { tick(); const id = setInterval(tick, 1000); return () => clearInterval(id); }, [tick]);

  const { days, hours, minutes, seconds } = getTimeComponents(diff);
  const isUnlocked = hasLock && diff <= 0;
  const noLock = !hasLock;

  return (
    <Card className="glass-card lightning-edge-cyan card-hover border-[var(--border)] rounded-2xl overflow-hidden relative">
      {/* Ambient orb */}
      <div className="card-orb w-32 h-32 -bottom-8 -left-8 bg-cyan-500/15" />

      <CardHeader className="pb-2 pt-5 px-5 relative z-10">
        <CardTitle className="font-display text-lg font-bold tracking-tight text-[var(--foreground)] flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-cyan-500/15 flex items-center justify-center">
            <Timer className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          Lock Countdown
          <span className={`ml-auto text-[10px] font-bold px-2.5 py-1 rounded-full border ${
            noLock
              ? 'bg-[var(--muted)] text-[var(--muted-foreground)] border-[var(--border)]'
              : isUnlocked
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
              : 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20'
          }`}>
            {noLock ? 'NO LOCK' : isUnlocked ? 'UNLOCKED' : 'LOCKED'}
          </span>
        </CardTitle>
      </CardHeader>

      <CardContent className="pt-2 pb-6 px-5 flex flex-col items-center justify-center min-h-[170px] gap-4 relative z-10">
        <AnimatePresence mode="wait">
          {noLock ? (
            <motion.div key="no-lock" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center gap-2 text-center">
              <div className="w-14 h-14 rounded-2xl bg-[var(--muted)] border border-[var(--border)] flex items-center justify-center">
                <LockOpen className="w-6 h-6 text-[var(--muted-foreground)]" />
              </div>
              <p className="text-sm font-semibold text-[var(--muted-foreground)]">No lock configured yet</p>
              <p className="text-xs text-[var(--muted-foreground)] opacity-60">Set a lock period before depositing</p>
            </motion.div>

          ) : isUnlocked ? (
            <motion.div key="unlocked" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center gap-2">
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ repeat: Infinity, duration: 2 }}
                className="w-14 h-14 rounded-2xl bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center"
              >
                <LockOpen className="w-6 h-6 text-emerald-400" />
              </motion.div>
              <p className="font-display text-2xl font-extrabold text-emerald-400">Vault Available</p>
              <p className="text-xs font-medium text-emerald-400/60">Ready to withdraw</p>
            </motion.div>

          ) : (
            <motion.div key="locked" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center gap-3 w-full">
              {/* Pulsing lock icon */}
              <div className="w-8 h-8 rounded-xl bg-cyan-500/15 border border-cyan-500/20 flex items-center justify-center ring-pulse">
                <Lock className="w-4 h-4 text-cyan-400" />
              </div>

              <div className="flex items-end gap-1 tabular-nums">
                {days > 0 && (<><TimeSegment value={days} label="DAYS" /><Colon /></>)}
                <TimeSegment value={hours} label="HRS" />
                <Colon />
                <TimeSegment value={minutes} label="MIN" />
                <Colon />
                <TimeSegment value={seconds} label="SEC" highlight />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {hasLock && !isUnlocked && unlockTime > 0 && (
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="text-xs font-medium text-[var(--muted-foreground)] bg-[var(--muted)] border border-[var(--border)] px-3 py-1.5 rounded-full"
          >
            Unlocks{' '}
            {new Date(unlockTime * 1000).toLocaleString(undefined, {
              weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit',
            })}
          </motion.p>
        )}
      </CardContent>
    </Card>
  );
}

function TimeSegment({ value, label, highlight }: { value: number; label: string; highlight?: boolean }) {
  return (
    <div className="flex flex-col items-center">
      <span className={`font-mono font-extrabold leading-none text-4xl md:text-5xl ${highlight ? 'text-cyan-400' : 'text-[var(--foreground)]'}`}>
        {pad(value)}
      </span>
      <span className="text-[9px] font-bold text-[var(--muted-foreground)] tracking-widest mt-1 uppercase">{label}</span>
    </div>
  );
}

function Colon() {
  return (
    <span className="font-mono font-black text-[var(--muted-foreground)] opacity-40 text-3xl md:text-4xl leading-none pb-5 mx-0.5">:</span>
  );
}