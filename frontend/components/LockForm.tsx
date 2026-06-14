'use client';

import { useState } from 'react';
import { useWriteContract, useWaitForTransactionReceipt, useAccount } from 'wagmi';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react';
import piggyBankArtifact from '@/abis/PiggyBank.json';
import { CONTRACT_ADDRESS, MIN_LOCK_DAYS } from '@/lib/constants';
import { useVaultData } from '@/lib/useVaultData';

const abi = piggyBankArtifact.abi as any;
const DAY_PRESETS = [7, 30, 90, 180, 365];

export default function LockForm() {
  const { address } = useAccount();
  const { unlockTime, hasLock, refetch } = useVaultData(address);
  const { writeContract, isPending, data: txHash } = useWriteContract();
  const { isLoading: isConfirming } = useWaitForTransactionReceipt({
    hash: txHash,
    onReplaced: () => toast.info('Transaction replaced.'),
  });

  const [days, setDays] = useState('30');
  const numericDays = parseInt(days, 10);
  const isValidDays = !isNaN(numericDays) && numericDays >= MIN_LOCK_DAYS;
  const targetTs = isValidDays ? Math.floor(Date.now() / 1000) + numericDays * 86400 : 0;
  const targetDate = isValidDays
    ? new Date(targetTs * 1000).toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })
    : '';
  const isTooShort = hasLock && isValidDays && targetTs <= unlockTime + 86400;

  const handleLock = () => {
    if (!address) { toast.error('Connect your wallet first.'); return; }
    if (!isValidDays) { toast.error(`Minimum lock duration is ${MIN_LOCK_DAYS} days.`); return; }
    if (isTooShort) { toast.error('New unlock time must be at least 1 day beyond your current lock.'); return; }
    writeContract(
      { address: CONTRACT_ADDRESS, abi, functionName: 'setOrExtendLock', args: [BigInt(targetTs)] },
      {
        onSuccess: () => toast.loading('Confirming lock on-chain…', { id: 'lock-confirm' }),
        onError: (err: any) => toast.error(err.shortMessage || err.message || 'Failed to update lock.'),
      },
    );
  };

  if (txHash && !isPending && !isConfirming) { toast.dismiss('lock-confirm'); }

  return (
    <Card className="glass-card lightning-edge border-[var(--border)] rounded-2xl overflow-hidden relative">
      {/* Orb */}
      <div className="card-orb w-48 h-48 -top-12 -right-12 bg-purple-500/12" />

      <CardHeader className="pb-4 pt-5 px-5 relative z-10">
        <CardTitle className="font-display text-lg font-bold tracking-tight text-[var(--foreground)] flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-purple-500/15 flex items-center justify-center ring-pulse">
            <Lock className="w-3.5 h-3.5 text-purple-400" />
          </div>
          {hasLock ? 'Extend Lock Period' : 'Set Lock Period'}
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-5 px-5 pb-5 relative z-10">
        {hasLock && (
          <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
            className="rounded-xl border border-indigo-500/20 bg-indigo-500/8 dark:bg-indigo-500/5 p-3 text-xs font-medium text-indigo-300 flex items-start gap-2"
          >
            <Lock className="w-3.5 h-3.5 mt-0.5 shrink-0 text-indigo-400" />
            <span>
              Current lock expires <strong>{new Date(unlockTime * 1000).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</strong>. Any new lock time must be set further into the future.
            </span>
          </motion.div>
        )}

        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-widest text-[var(--muted-foreground)] block">
            Lock Duration (Days) — Min {MIN_LOCK_DAYS}
          </label>
          <Input
            type="number" min={MIN_LOCK_DAYS} step="1" value={days}
            onChange={(e) => setDays(e.target.value)}
            placeholder={`${MIN_LOCK_DAYS}+`}
            className="text-2xl h-14 pl-4 font-mono font-bold rounded-xl border-[var(--border)] bg-[var(--input)] text-[var(--foreground)] placeholder:text-[var(--muted-foreground)]"
          />
          <AnimatePresence>
            {days && !isValidDays && (
              <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                className="text-xs font-semibold text-red-400 flex items-center gap-1"
              >
                <AlertTriangle className="w-3 h-3" /> Minimum {MIN_LOCK_DAYS} days required
              </motion.p>
            )}
            {isTooShort && (
              <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                className="text-xs font-semibold text-amber-400 flex items-center gap-1"
              >
                <AlertTriangle className="w-3 h-3" /> Must extend at least 1 day beyond your current lock
              </motion.p>
            )}
          </AnimatePresence>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-widest text-[var(--muted-foreground)] block">Quick Presets</label>
          <div className="flex flex-wrap gap-2">
            {DAY_PRESETS.map((d) => {
              const isActive = days === String(d);
              return (
                <motion.button
                  key={d} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                  onClick={() => setDays(String(d))}
                  className={`px-4 py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                    isActive
                      ? 'bg-purple-600 border-purple-600 text-white shadow-md shadow-purple-500/25'
                      : 'bg-[var(--muted)] border-[var(--border)] text-[var(--foreground)] hover:border-purple-500/40'
                  }`}
                >
                  {d === 365 ? '1 Year' : `${d}d`}
                </motion.button>
              );
            })}
          </div>
        </div>

        <AnimatePresence>
          {isValidDays && !isTooShort && (
            <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="rounded-xl border border-blue-500/20 bg-blue-500/8 dark:bg-blue-500/5 p-3.5 text-xs font-medium text-blue-300 flex items-start gap-2"
            >
              <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 shrink-0 text-blue-400" />
              <span>
                Assets will be locked until <strong className="text-blue-200">{targetDate}</strong>. No withdrawals permitted before this date without an emergency exit fee.
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        <Button
          onClick={handleLock}
          disabled={isPending || isConfirming || !isValidDays || !!isTooShort}
          className="btn-primary w-full h-12 text-sm cursor-pointer"
        >
          {isPending ? (
            <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Awaiting Wallet…</>
          ) : isConfirming ? (
            <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Confirming On-Chain…</>
          ) : hasLock ? 'Extend Lock Period' : 'Confirm Lock Period'}
        </Button>
      </CardContent>
    </Card>
  );
}