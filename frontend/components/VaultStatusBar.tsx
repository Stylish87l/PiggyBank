'use client';

import { motion } from 'framer-motion';
import { ShieldCheck, ShieldOff, Clock } from 'lucide-react';
import { useVaultData } from '@/lib/useVaultData';

interface VaultStatusBarProps {
  address: `0x${string}`;
}

export default function VaultStatusBar({ address }: VaultStatusBarProps) {
  const { isLocked, hasLock, unlockTime } = useVaultData(address);

  const unlockDateStr = hasLock && unlockTime > 0
    ? new Date(unlockTime * 1000).toLocaleDateString(undefined, {
        month: 'short', day: 'numeric', year: 'numeric',
      })
    : null;

  const now = Math.floor(Date.now() / 1000);
  const totalDuration = hasLock && unlockTime > 0 ? unlockTime - (now - (unlockTime - now)) : 0;
  const remaining = hasLock ? Math.max(0, unlockTime - now) : 0;
  const progressPct = totalDuration > 0 ? Math.min(100, ((totalDuration - remaining) / totalDuration) * 100) : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
      className="glass-card lightning-edge rounded-2xl px-4 py-3 flex items-center gap-3"
    >
      {/* Orb */}
      <div
        className={`card-orb w-20 h-20 -top-4 -right-4 ${
          isLocked ? 'bg-purple-500/20' : hasLock ? 'bg-emerald-500/20' : 'bg-slate-500/10'
        }`}
      />

      {/* Status icon */}
      <div className={`relative z-10 w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
        isLocked
          ? 'bg-purple-500/20 ring-pulse'
          : hasLock
          ? 'bg-emerald-500/20'
          : 'bg-[var(--muted)]'
      }`}>
        {isLocked
          ? <ShieldCheck className="w-4 h-4 text-purple-400" />
          : hasLock
          ? <ShieldOff className="w-4 h-4 text-emerald-400" />
          : <Clock className="w-4 h-4 text-[var(--muted-foreground)]" />
        }
      </div>

      {/* Text */}
      <div className="relative z-10 flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-xs font-black uppercase tracking-widest text-[var(--foreground)]">
            {isLocked ? 'Vault Locked' : hasLock ? 'Vault Unlocked' : 'No Lock Set'}
          </p>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
            isLocked
              ? 'bg-purple-500/15 text-purple-400 border-purple-500/25'
              : hasLock
              ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25'
              : 'bg-[var(--muted)] text-[var(--muted-foreground)] border-[var(--border)]'
          }`}>
            {isLocked ? 'SECURED' : hasLock ? 'AVAILABLE' : 'INACTIVE'}
          </span>
        </div>
        <p className="text-[11px] text-[var(--muted-foreground)] font-medium mt-0.5 truncate">
          {isLocked && unlockDateStr
            ? `Unlocks ${unlockDateStr} · Set lock before depositing`
            : hasLock
            ? 'Ready to withdraw · Start a new lock to re-secure'
            : 'Set a lock period using the Lock tab below'}
        </p>
      </div>

      {/* Progress arc (only when locked) */}
      {isLocked && (
        <div className="relative z-10 shrink-0 w-10 h-10">
          <svg viewBox="0 0 36 36" className="w-10 h-10 -rotate-90">
            <circle cx="18" cy="18" r="15" fill="none" stroke="rgba(147,51,234,0.15)" strokeWidth="3" />
            <motion.circle
              cx="18" cy="18" r="15"
              fill="none"
              stroke="url(#prog-gradient)"
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 15}`}
              initial={{ strokeDashoffset: 2 * Math.PI * 15 }}
              animate={{ strokeDashoffset: 2 * Math.PI * 15 * (1 - progressPct / 100) }}
              transition={{ duration: 1, ease: 'easeOut' }}
            />
            <defs>
              <linearGradient id="prog-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#9333ea" />
                <stop offset="100%" stopColor="#22d3ee" />
              </linearGradient>
            </defs>
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-[9px] font-black text-purple-400">
            {Math.round(progressPct)}%
          </span>
        </div>
      )}
    </motion.div>
  );
}