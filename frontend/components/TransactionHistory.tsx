'use client';

import { useState, useEffect, useCallback } from 'react';
import { useWatchContractEvent, usePublicClient } from 'wagmi';
import { formatUnits, zeroAddress, parseAbiItem } from 'viem';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollText, ExternalLink } from 'lucide-react';
import piggyBankArtifact from '@/abis/PiggyBank.json';
import { CONTRACT_ADDRESS, getTokenByAddress } from '@/lib/constants';

const abi = piggyBankArtifact.abi as any;
const STORAGE_KEY = (addr: string) => `piggybank_history_${addr.toLowerCase()}`;
const MAX_HISTORY = 50;

export interface ActivityLog {
  type: 'Deposit' | 'Withdrawal' | 'Emergency Withdrawal';
  amount: string;
  tokenSymbol: string;
  time: string;
  timestamp: number;
  txHash: string;
  blockNumber: number;
}

interface TransactionHistoryProps {
  address: `0x${string}`;
  fullView?: boolean;
}

function getTokenInfo(tokenAddr: string) {
  const token = getTokenByAddress(tokenAddr);
  return { symbol: token?.symbol ?? 'ERC-20', decimals: token?.decimals ?? 18 };
}

function formatAmount(raw: bigint, decimals: number) {
  return parseFloat(formatUnits(raw, decimals)).toLocaleString(undefined, { maximumFractionDigits: 6, minimumFractionDigits: 2 });
}

function loadFromStorage(address: string): ActivityLog[] {
  try { const raw = localStorage.getItem(STORAGE_KEY(address)); return raw ? JSON.parse(raw) : []; } catch { return []; }
}

function saveToStorage(address: string, logs: ActivityLog[]) {
  try { localStorage.setItem(STORAGE_KEY(address), JSON.stringify(logs.slice(0, MAX_HISTORY))); } catch {}
}

function mergeAndSort(existing: ActivityLog[], incoming: ActivityLog[]): ActivityLog[] {
  const map = new Map(existing.map((l) => [l.txHash + l.type, l]));
  for (const log of incoming) map.set(log.txHash + log.type, log);
  return Array.from(map.values()).sort((a, b) => b.timestamp - a.timestamp);
}

const TYPE_META: Record<ActivityLog['type'], { color: string; sign: string; dotColor: string }> = {
  Deposit:              { color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', sign: '+', dotColor: 'bg-emerald-400' },
  Withdrawal:           { color: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',   sign: '-', dotColor: 'bg-indigo-400' },
  'Emergency Withdrawal': { color: 'bg-red-500/10 text-red-400 border-red-500/20',          sign: '-', dotColor: 'bg-red-400' },
};

export default function TransactionHistory({ address, fullView = false }: TransactionHistoryProps) {
  const [history, setHistory] = useState<ActivityLog[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const publicClient = usePublicClient();

  useEffect(() => {
    if (!address) return;
    setHistory(loadFromStorage(address));
    setIsLoadingHistory(false);
  }, [address]);

  useEffect(() => {
    if (address && history.length > 0) saveToStorage(address, history);
  }, [address, history]);

  const fetchHistorical = useCallback(async () => {
    if (!publicClient || !address) return;
    try {
      const currentBlock = await publicClient.getBlockNumber();
      const fromBlock = currentBlock > 1000n ? currentBlock - 1000n : 0n;
      const [depositLogs, withdrawLogs, emergencyLogs] = await Promise.all([
        publicClient.getLogs({ address: CONTRACT_ADDRESS, event: parseAbiItem('event Deposited(address indexed user, address indexed token, uint256 amount)'), args: { user: address }, fromBlock, toBlock: 'latest' }),
        publicClient.getLogs({ address: CONTRACT_ADDRESS, event: parseAbiItem('event Withdrawn(address indexed user, address indexed token, uint256 amount)'), args: { user: address }, fromBlock, toBlock: 'latest' }),
        publicClient.getLogs({ address: CONTRACT_ADDRESS, event: parseAbiItem('event EmergencyWithdrawn(address indexed user, address indexed token, uint256 userAmount, uint256 fee)'), args: { user: address }, fromBlock, toBlock: 'latest' }),
      ]);

      const incoming: ActivityLog[] = [];
      for (const log of depositLogs) {
        const { symbol, decimals } = getTokenInfo((log.args.token as string) ?? zeroAddress);
        incoming.push({ type: 'Deposit', amount: formatAmount((log.args.amount as bigint) ?? 0n, decimals), tokenSymbol: symbol, time: new Date().toLocaleTimeString(), timestamp: Number(log.blockNumber), txHash: log.transactionHash ?? '', blockNumber: Number(log.blockNumber) });
      }
      for (const log of withdrawLogs) {
        const { symbol, decimals } = getTokenInfo((log.args.token as string) ?? zeroAddress);
        incoming.push({ type: 'Withdrawal', amount: formatAmount((log.args.amount as bigint) ?? 0n, decimals), tokenSymbol: symbol, time: new Date().toLocaleTimeString(), timestamp: Number(log.blockNumber), txHash: log.transactionHash ?? '', blockNumber: Number(log.blockNumber) });
      }
      for (const log of emergencyLogs) {
        const { symbol, decimals } = getTokenInfo((log.args.token as string) ?? zeroAddress);
        incoming.push({ type: 'Emergency Withdrawal', amount: formatAmount((log.args.userAmount as bigint) ?? 0n, decimals), tokenSymbol: symbol, time: new Date().toLocaleTimeString(), timestamp: Number(log.blockNumber), txHash: log.transactionHash ?? '', blockNumber: Number(log.blockNumber) });
      }
      if (incoming.length > 0) setHistory((prev) => mergeAndSort(prev, incoming));
    } catch {}
  }, [publicClient, address]);

  useEffect(() => { fetchHistorical(); }, [fetchHistorical]);

  const addEvent = useCallback((entry: ActivityLog) => { setHistory((prev) => mergeAndSort(prev, [entry])); }, []);

  useWatchContractEvent({
    address: CONTRACT_ADDRESS, abi, eventName: 'Deposited',
    onLogs: (logs) => {
      for (const log of logs as any[]) {
        if (log.args.user?.toLowerCase() !== address?.toLowerCase()) continue;
        const { symbol, decimals } = getTokenInfo(log.args.token ?? zeroAddress);
        addEvent({ type: 'Deposit', amount: formatAmount(log.args.amount ?? 0n, decimals), tokenSymbol: symbol, time: new Date().toLocaleTimeString(), timestamp: Date.now(), txHash: log.transactionHash ?? '', blockNumber: Number(log.blockNumber ?? 0) });
      }
    },
  });

  useWatchContractEvent({
    address: CONTRACT_ADDRESS, abi, eventName: 'Withdrawn',
    onLogs: (logs) => {
      for (const log of logs as any[]) {
        if (log.args.user?.toLowerCase() !== address?.toLowerCase()) continue;
        const { symbol, decimals } = getTokenInfo(log.args.token ?? zeroAddress);
        addEvent({ type: 'Withdrawal', amount: formatAmount(log.args.amount ?? 0n, decimals), tokenSymbol: symbol, time: new Date().toLocaleTimeString(), timestamp: Date.now(), txHash: log.transactionHash ?? '', blockNumber: Number(log.blockNumber ?? 0) });
      }
    },
  });

  useWatchContractEvent({
    address: CONTRACT_ADDRESS, abi, eventName: 'EmergencyWithdrawn',
    onLogs: (logs) => {
      for (const log of logs as any[]) {
        if (log.args.user?.toLowerCase() !== address?.toLowerCase()) continue;
        const { symbol, decimals } = getTokenInfo(log.args.token ?? zeroAddress);
        addEvent({ type: 'Emergency Withdrawal', amount: formatAmount(log.args.userAmount ?? 0n, decimals), tokenSymbol: symbol, time: new Date().toLocaleTimeString(), timestamp: Date.now(), txHash: log.transactionHash ?? '', blockNumber: Number(log.blockNumber ?? 0) });
      }
    },
  });

  const displayedHistory = fullView ? history : history.slice(0, 8);

  return (
    <Card className="glass-card lightning-edge card-hover border-[var(--border)] rounded-2xl overflow-hidden w-full relative">
      {/* Ambient orb */}
      <div className="card-orb w-28 h-28 -bottom-6 -right-6 bg-purple-500/10" />

      <CardHeader className="pb-4 pt-5 px-5 relative z-10">
        <CardTitle className="font-display text-lg font-bold tracking-tight text-[var(--foreground)] flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-purple-500/15 flex items-center justify-center">
            <ScrollText className="w-3.5 h-3.5 text-purple-400" />
          </div>
          {fullView ? 'Complete Ledger' : 'Live Activity'}
          {/* Live pulse dot */}
          {!fullView && <span className="live-dot ml-1" />}
          {history.length > 0 && (
            <span className="ml-auto text-xs font-bold bg-[var(--muted)] border border-[var(--border)] px-2 py-0.5 rounded-full text-[var(--muted-foreground)]">
              {history.length}
            </span>
          )}
        </CardTitle>
      </CardHeader>

      <CardContent className="px-5 pb-5 relative z-10">
        <div className={`space-y-2 overflow-y-auto pr-1 custom-scrollbar ${fullView ? 'max-h-[600px]' : 'max-h-[340px]'}`}>
          <AnimatePresence initial={false}>
            {isLoadingHistory ? (
              <div className="space-y-2">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-14 w-full rounded-xl" />)}</div>
            ) : displayedHistory.length === 0 ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-12 flex flex-col items-center gap-2">
                <span className="text-3xl opacity-20">📭</span>
                <p className="text-sm font-semibold text-[var(--muted-foreground)]">No transactions yet</p>
                <p className="text-xs text-[var(--muted-foreground)] opacity-50 max-w-[200px] text-center">On-chain events appear here in real-time.</p>
              </motion.div>
            ) : (
              displayedHistory.map((tx, i) => {
                const meta = TYPE_META[tx.type];
                return (
                  <motion.div
                    key={tx.txHash + tx.type + i}
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    transition={{ duration: 0.18 }}
                    className="flex justify-between items-center p-3 bg-[var(--muted)] border border-[var(--border)] rounded-xl hover:border-purple-500/25 transition-colors"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`w-2 h-2 rounded-full shrink-0 ${meta.dotColor}`} />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-bold text-[var(--foreground)] truncate">{tx.type}</p>
                          <Badge variant="outline" className={`text-[10px] font-bold h-4 px-1.5 ${meta.color}`}>{tx.tokenSymbol}</Badge>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-[var(--muted-foreground)] font-medium mt-0.5">
                          <span>{tx.time}</span>
                          <span>·</span>
                          {tx.txHash ? (
                            <a href={`https://etherscan.io/tx/${tx.txHash}`} target="_blank" rel="noopener noreferrer"
                              className="font-mono hover:text-purple-400 transition-colors flex items-center gap-0.5 opacity-60 hover:opacity-100"
                            >
                              {tx.txHash.slice(0, 6)}…{tx.txHash.slice(-4)}
                              <ExternalLink className="w-2.5 h-2.5" />
                            </a>
                          ) : (
                            <span className="opacity-40 font-mono">pending</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <p className={`font-mono text-sm font-black shrink-0 ml-3 ${tx.type === 'Deposit' ? 'text-emerald-400' : 'text-orange-400'}`}>
                      {meta.sign}{tx.amount}
                    </p>
                  </motion.div>
                );
              })
            )}
          </AnimatePresence>
        </div>
      </CardContent>
    </Card>
  );
}