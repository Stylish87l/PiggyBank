'use client';

import { useState, useMemo } from 'react';
import { useWriteContract, useWaitForTransactionReceipt, useReadContract, useAccount } from 'wagmi';
import { parseUnits, zeroAddress, isAddress, erc20Abi } from 'viem';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowDownToLine, AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react';
import piggyBankArtifact from '@/abis/PiggyBank.json';
import { CONTRACT_ADDRESS, TOKEN_LIST, type TokenMetadata } from '@/lib/constants';
import { useLivePrices } from '@/lib/useLivePrices';
import { useVaultData } from '@/lib/useVaultData';

const abi = piggyBankArtifact.abi as any;
const CUSTOM_TOKEN: TokenMetadata = { symbol: 'CUSTOM', address: zeroAddress, decimals: 18, coingeckoId: '', color: '#888' };

export default function DepositForm() {
  const { address } = useAccount();
  const { hasLock, refetch } = useVaultData(address);
  const { toUsd } = useLivePrices();
  const { writeContract, isPending, data: txHash } = useWriteContract();
  const { writeContract: writeApprove, isPending: isApproving, data: approveTxHash } = useWriteContract();
  const { isLoading: isConfirming } = useWaitForTransactionReceipt({ hash: txHash });
  const { isLoading: isApproveConfirming } = useWaitForTransactionReceipt({ hash: approveTxHash });

  const [amount, setAmount] = useState('');
  const [selectedToken, setSelectedToken] = useState<TokenMetadata>(TOKEN_LIST[0]);
  const [customAddress, setCustomAddress] = useState('');
  const [customDecimals, setCustomDecimals] = useState('18');
  const [showCustom, setShowCustom] = useState(false);

  const activeToken: TokenMetadata = showCustom
    ? { ...CUSTOM_TOKEN, address: isAddress(customAddress) ? customAddress as `0x${string}` : zeroAddress, decimals: parseInt(customDecimals, 10) || 18 }
    : selectedToken;

  const isERC20 = activeToken.address !== zeroAddress;

  const parsedAmount = useMemo(() => {
    if (!amount || isNaN(parseFloat(amount))) return 0n;
    try { return parseUnits(amount, activeToken.decimals); } catch { return 0n; }
  }, [amount, activeToken.decimals]);

  const usdValue = useMemo(() => {
    const n = parseFloat(amount || '0');
    if (isNaN(n) || showCustom) return null;
    return toUsd(activeToken.coingeckoId, n).toLocaleString(undefined, { style: 'currency', currency: 'USD' });
  }, [amount, activeToken, showCustom, toUsd]);

  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: activeToken.address !== zeroAddress ? activeToken.address : undefined,
    abi: erc20Abi,
    functionName: 'allowance',
    args: address && activeToken.address !== zeroAddress ? [address, CONTRACT_ADDRESS] : undefined,
    query: { enabled: !!address && isERC20 },
  });

  const needsApproval = isERC20 && parsedAmount > 0n && (allowance ?? 0n) < parsedAmount;

  const validationError = useMemo(() => {
    if (!hasLock) return 'You must set a lock period before depositing.';
    if (showCustom && customAddress && !isAddress(customAddress)) return 'Invalid token contract address.';
    if (amount && parsedAmount === 0n) return 'Enter a valid amount greater than zero.';
    return null;
  }, [hasLock, showCustom, customAddress, amount, parsedAmount]);

  const handleApprove = () => {
    if (!address || !isERC20) return;
    writeApprove(
      { address: activeToken.address, abi: erc20Abi, functionName: 'approve', args: [CONTRACT_ADDRESS, parsedAmount] },
      {
        onSuccess: () => toast.loading('Confirming approval…', { id: 'approve-confirm' }),
        onError: (err: any) => toast.error(err.shortMessage || 'Approval failed.'),
      },
    );
  };

  if (approveTxHash && !isApproving && !isApproveConfirming) { toast.dismiss('approve-confirm'); refetchAllowance(); }

  const handleDeposit = () => {
    if (!address) { toast.error('Connect your wallet first.'); return; }
    if (validationError) { toast.error(validationError); return; }
    if (needsApproval) { toast.error('Approve token spend first.'); return; }
    writeContract(
      { address: CONTRACT_ADDRESS, abi, functionName: 'deposit', args: [activeToken.address, parsedAmount, 0n], value: !isERC20 ? parsedAmount : undefined },
      {
        onSuccess: () => toast.loading('Confirming deposit…', { id: 'deposit-confirm' }),
        onError: (err: any) => toast.error(err.shortMessage || err.message || 'Deposit failed.'),
      },
    );
  };

  if (txHash && !isPending && !isConfirming) { toast.dismiss('deposit-confirm'); refetch(); }

  const isBusy = isPending || isConfirming || isApproving || isApproveConfirming;

  return (
    <Card className="glass-card lightning-edge-emerald border-[var(--border)] rounded-2xl overflow-hidden relative">
      <div className="card-orb w-44 h-44 -top-10 -right-10 bg-emerald-500/10" />

      <CardHeader className="pb-4 pt-5 px-5 relative z-10">
        <CardTitle className="font-display text-lg font-bold tracking-tight text-[var(--foreground)] flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-emerald-500/15 flex items-center justify-center">
            <ArrowDownToLine className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          Multi-Asset Deposit
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-5 px-5 pb-5 relative z-10">
        <AnimatePresence>
          {!hasLock && (
            <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="rounded-xl border border-red-500/25 bg-red-500/8 p-3 text-xs font-semibold text-red-400 flex items-start gap-2"
            >
              <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              Set a lock period in the <strong>Lock</strong> tab before depositing.
            </motion.div>
          )}
        </AnimatePresence>

        <div>
          <label className="text-xs font-semibold uppercase tracking-widest text-[var(--muted-foreground)] block mb-2">Select Asset</label>
          <div className="grid grid-cols-3 gap-2">
            {TOKEN_LIST.map((token) => (
              <motion.button
                key={token.symbol} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                onClick={() => { setSelectedToken(token); setShowCustom(false); }}
                className={`p-2.5 rounded-xl text-sm font-bold tracking-wide transition-all border cursor-pointer ${
                  selectedToken.symbol === token.symbol && !showCustom
                    ? 'bg-purple-600 text-white border-purple-600 shadow-lg shadow-purple-500/25'
                    : 'bg-[var(--muted)] text-[var(--foreground)] border-[var(--border)] hover:border-purple-500/40'
                }`}
              >
                {token.symbol}
              </motion.button>
            ))}
          </div>
          <div className="mt-2.5 flex justify-end">
            <button onClick={() => setShowCustom((v) => !v)}
              className={`text-xs font-bold transition-colors cursor-pointer hover:underline ${showCustom ? 'text-purple-400' : 'text-[var(--muted-foreground)]'}`}
            >
              {showCustom ? '← Preset tokens' : '+ Deposit unlisted ERC-20'}
            </button>
          </div>
        </div>

        <AnimatePresence>
          {showCustom && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="space-y-2 overflow-hidden">
              <div>
                <label className="text-xs font-semibold uppercase tracking-widest text-[var(--muted-foreground)] block mb-1">Token Contract Address</label>
                <Input placeholder="0x…" value={customAddress} onChange={(e) => setCustomAddress(e.target.value)}
                  className="font-mono bg-[var(--input)] border-[var(--border)] h-11 rounded-xl text-[var(--foreground)]" />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-widest text-[var(--muted-foreground)] block mb-1">Token Decimals</label>
                <Input type="number" min="0" max="18" value={customDecimals} onChange={(e) => setCustomDecimals(e.target.value)}
                  className="font-mono bg-[var(--input)] border-[var(--border)] h-10 rounded-xl w-24 text-[var(--foreground)]" />
                <p className="text-[10px] text-amber-400 mt-1">⚠ Verify decimal count on the token contract.</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="space-y-1">
          <label className="text-xs font-semibold uppercase tracking-widest text-[var(--muted-foreground)] block">Amount</label>
          <div className="relative">
            <Input type="number" step="any" min="0" placeholder="0.0" value={amount} onChange={(e) => setAmount(e.target.value)}
              className="text-2xl h-14 pl-4 pr-20 font-mono font-bold bg-[var(--input)] border-[var(--border)] rounded-xl text-[var(--foreground)]" />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 font-bold text-sm text-[var(--muted-foreground)] select-none">{activeToken.symbol}</span>
          </div>
          {usdValue && <p className="text-right text-xs font-semibold text-emerald-400 tabular-nums">≈ {usdValue}</p>}
        </div>

        <AnimatePresence>
          {isERC20 && parsedAmount > 0n && (
            <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              {needsApproval ? (
                <div className="rounded-xl border border-amber-500/20 bg-amber-500/8 p-3 text-xs font-medium text-amber-400">
                  <p className="font-semibold mb-2 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Token approval required before deposit</p>
                  <Button onClick={handleApprove} disabled={isApproving || isApproveConfirming} size="sm"
                    className="h-8 text-xs font-bold rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30"
                  >
                    {isApproving || isApproveConfirming ? <><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Approving…</> : `Approve ${activeToken.symbol}`}
                  </Button>
                </div>
              ) : (
                <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/8 p-3 text-xs font-semibold text-emerald-400 flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> Token spend approved — ready to deposit.
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {validationError && amount && (
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="text-xs font-semibold text-red-400 flex items-center gap-1"
            >
              <AlertTriangle className="w-3 h-3" /> {validationError}
            </motion.p>
          )}
        </AnimatePresence>

        <Button
          onClick={handleDeposit}
          disabled={isBusy || !amount || parsedAmount === 0n || !!validationError || needsApproval}
          className="btn-primary w-full h-12 text-sm cursor-pointer"
        >
          {isPending || isConfirming ? (
            <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{isPending ? 'Awaiting Wallet…' : 'Confirming…'}</>
          ) : `Deposit ${showCustom ? 'Token' : activeToken.symbol}`}
        </Button>
      </CardContent>
    </Card>
  );
}