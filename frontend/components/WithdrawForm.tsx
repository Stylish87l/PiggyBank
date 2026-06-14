'use client';

import { useState, useMemo } from 'react';
import { useWriteContract, useWaitForTransactionReceipt, useAccount } from 'wagmi';
import { parseUnits, zeroAddress } from 'viem';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowUpFromLine, AlertTriangle, ShieldAlert, Loader2, Clock } from 'lucide-react';
import piggyBankArtifact from '@/abis/PiggyBank.json';
import { CONTRACT_ADDRESS, TOKEN_LIST, type TokenMetadata } from '@/lib/constants';
import { useLivePrices } from '@/lib/useLivePrices';
import { useVaultData } from '@/lib/useVaultData';

const abi = piggyBankArtifact.abi as any;
const WITHDRAW_TOKENS = TOKEN_LIST.slice(0, 4);

export default function WithdrawForm() {
  const { address } = useAccount();
  const { isLocked, hasLock, cooldownActive, emergencyFeeBps, emergencyFeePercent, emergencyExitEnabled, refetch } = useVaultData(address);
  const { toUsd } = useLivePrices();
  const { writeContract, isPending, data: txHash } = useWriteContract();
  const { isLoading: isConfirming } = useWaitForTransactionReceipt({ hash: txHash });

  const [amount, setAmount] = useState('');
  const [selectedToken, setSelectedToken] = useState<TokenMetadata>(WITHDRAW_TOKENS[0]);
  const [emergencyMode, setEmergencyMode] = useState(false);

  const parsedAmount = useMemo(() => {
    if (!amount || isNaN(parseFloat(amount))) return 0n;
    try { return parseUnits(amount, selectedToken.decimals); } catch { return 0n; }
  }, [amount, selectedToken.decimals]);

  const usdValue = useMemo(() => {
    const n = parseFloat(amount || '0');
    if (isNaN(n)) return null;
    return toUsd(selectedToken.coingeckoId, n).toLocaleString(undefined, { style: 'currency', currency: 'USD' });
  }, [amount, selectedToken, toUsd]);

  const afterFeeAmount = useMemo(() => {
    if (!emergencyMode || parsedAmount === 0n) return null;
    const fee = (parsedAmount * BigInt(emergencyFeeBps)) / 10000n;
    const net = parsedAmount - fee;
    return (parseFloat(net.toString()) / 10 ** selectedToken.decimals).toFixed(6);
  }, [emergencyMode, parsedAmount, emergencyFeeBps, selectedToken.decimals]);

  const handleWithdraw = () => {
    if (!address) { toast.error('Connect your wallet first.'); return; }
    if (!amount || parsedAmount === 0n) { toast.error('Enter a valid amount.'); return; }
    if (emergencyMode && cooldownActive) { toast.error('Emergency cooldown is active.'); return; }
    if (emergencyMode && !emergencyExitEnabled) { toast.error('Emergency exit is disabled by the contract owner.'); return; }
    writeContract(
      { address: CONTRACT_ADDRESS, abi, functionName: emergencyMode ? 'emergencyWithdraw' : 'withdraw', args: [selectedToken.address, parsedAmount] },
      {
        onSuccess: () => toast.loading(emergencyMode ? 'Confirming emergency withdrawal…' : 'Confirming withdrawal…', { id: 'withdraw-confirm' }),
        onError: (err: any) => toast.error(err.shortMessage || err.message || 'Withdrawal failed.'),
      },
    );
  };

  if (txHash && !isPending && !isConfirming) { toast.dismiss('withdraw-confirm'); refetch(); }

  const isBusy = isPending || isConfirming;

  return (
    <Card className="glass-card lightning-edge-orange border-[var(--border)] rounded-2xl overflow-hidden relative">
      <div className="card-orb w-44 h-44 -top-10 -right-10 bg-orange-500/10" />

      <CardHeader className="pb-4 pt-5 px-5 relative z-10">
        <CardTitle className="font-display text-lg font-bold tracking-tight text-[var(--foreground)] flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-orange-500/15 flex items-center justify-center">
            <ArrowUpFromLine className="w-3.5 h-3.5 text-orange-400" />
          </div>
          Withdraw Assets
          <AnimatePresence>
            {emergencyMode && (
              <motion.span initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -6 }}
                className="ml-auto text-red-400 text-[10px] font-bold tracking-widest uppercase bg-red-500/10 px-2.5 py-1 rounded-lg border border-red-500/20"
              >
                Emergency Mode
              </motion.span>
            )}
          </AnimatePresence>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-5 px-5 pb-5 relative z-10">
        {hasLock && isLocked && !emergencyMode && (
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/8 p-3 text-xs font-medium text-amber-400 flex items-start gap-2">
            <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            Vault is locked. Standard withdraw requires lock expiry, or use Emergency Exit with a <strong>{emergencyFeePercent}%</strong> penalty.
          </div>
        )}

        <AnimatePresence>
          {cooldownActive && (
            <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="rounded-xl border border-orange-500/20 bg-orange-500/8 p-3 text-xs font-semibold text-orange-400 flex items-start gap-2"
            >
              <Clock className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              Emergency cooldown is active. Please wait before another emergency withdrawal.
            </motion.div>
          )}
        </AnimatePresence>

        <div className="grid grid-cols-4 gap-2">
          {WITHDRAW_TOKENS.map((token) => (
            <motion.button key={token.symbol} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              onClick={() => setSelectedToken(token)}
              className={`py-3 rounded-xl text-sm font-bold tracking-wide cursor-pointer transition-all border ${
                selectedToken.symbol === token.symbol
                  ? 'bg-purple-600 text-white border-purple-600 shadow-lg shadow-purple-500/25'
                  : 'bg-[var(--muted)] text-[var(--muted-foreground)] border-[var(--border)] hover:border-purple-500/40'
              }`}
            >
              {token.symbol}
            </motion.button>
          ))}
        </div>

        <div className="space-y-1">
          <label className="text-xs font-semibold uppercase tracking-widest text-[var(--muted-foreground)] block">Amount to Withdraw</label>
          <div className="relative">
            <Input type="number" step="any" min="0" placeholder="0.0" value={amount} onChange={(e) => setAmount(e.target.value)}
              className="text-2xl h-14 pl-4 pr-20 font-mono font-bold bg-[var(--input)] border-[var(--border)] rounded-xl text-[var(--foreground)]" />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 font-bold text-sm text-[var(--muted-foreground)] select-none">{selectedToken.symbol}</span>
          </div>
          {usdValue && <p className="text-right text-xs font-bold text-[var(--muted-foreground)] tabular-nums">≈ {usdValue}</p>}
        </div>

        <AnimatePresence>
          {emergencyMode && afterFeeAmount && (
            <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="rounded-xl border border-red-500/25 bg-red-500/8 p-3.5 space-y-2"
            >
              <p className="text-xs font-black text-red-400 flex items-center gap-1.5"><ShieldAlert className="w-3.5 h-3.5" /> Emergency Exit Summary</p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs font-medium">
                <span className="text-[var(--muted-foreground)]">Penalty fee</span>
                <span className="text-red-400 font-bold text-right">{emergencyFeePercent}%</span>
                <span className="text-[var(--muted-foreground)]">You receive</span>
                <span className="text-emerald-400 font-bold text-right">{afterFeeAmount} {selectedToken.symbol}</span>
                <span className="text-[var(--muted-foreground)]">Cooldown after</span>
                <span className="text-amber-400 font-bold text-right">7 days</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="grid grid-cols-2 gap-3">
          <Button onClick={() => { setEmergencyMode(false); handleWithdraw(); }}
            disabled={isBusy || !amount || parsedAmount === 0n}
            className="btn-primary h-12 text-sm cursor-pointer"
          >
            {isBusy && !emergencyMode ? <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> Confirming…</> : 'Standard Withdraw'}
          </Button>

          <Button variant="destructive"
            onClick={() => { setEmergencyMode(true); handleWithdraw(); }}
            disabled={isBusy || !amount || parsedAmount === 0n || cooldownActive || !emergencyExitEnabled}
            className="h-12 text-sm font-bold cursor-pointer disabled:opacity-40 rounded-xl"
            title={!emergencyExitEnabled ? 'Emergency exit disabled' : cooldownActive ? 'Cooldown active' : `${emergencyFeePercent}% penalty`}
          >
            {isBusy && emergencyMode ? <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> Confirming…</> : 'Emergency Exit'}
          </Button>
        </div>

        {!emergencyExitEnabled && (
          <p className="text-xs text-center text-[var(--muted-foreground)] opacity-60 font-medium">Emergency exit is currently disabled by the contract admin.</p>
        )}
        <p className="text-xs text-center text-[var(--muted-foreground)] opacity-50 font-medium">Standard withdrawals require the lock period to have expired.</p>
      </CardContent>
    </Card>
  );
}