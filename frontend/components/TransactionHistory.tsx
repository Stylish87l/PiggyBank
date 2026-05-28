'use client';

import { useState } from 'react';
import { useWatchContractEvent } from 'wagmi';
import { formatUnits, zeroAddress } from 'viem';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import piggyBankArtifact from '@/abis/PiggyBank.json';

const CONTRACT_ADDRESS = (process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || '0x5FbDB2315678afecb367f032d93F642f64180aa3') as `0x${string}`;

// Added fullView as an optional property to completely resolve the VaultDashboard compilation conflict
interface TransactionHistoryProps {
  address: string;
  fullView?: boolean; 
}

interface ActivityLog {
  type: 'Deposit' | 'Withdrawal' | 'Lock Extension';
  amount?: string;
  tokenSymbol: string;
  time: string;
  txHash: string;
}

export default function TransactionHistory({ address, fullView = false }: TransactionHistoryProps) {
  const [history, setHistory] = useState<ActivityLog[]>([]);

  // Helper utility to identify asset names based on address mappings
  const getAssetSymbol = (tokenAddress: string) => {
    if (tokenAddress === zeroAddress) return 'ETH';
    if (tokenAddress.toLowerCase() === '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'.toLowerCase()) return 'USDC';
    if (tokenAddress.toLowerCase() === '0xdAC17F958D2ee523a2206206994597C13D831ec7'.toLowerCase()) return 'USDT';
    return 'ERC-20';
  };

  // Helper utility to get asset decimals
  const getAssetDecimals = (tokenAddress: string) => {
    if (tokenAddress.toLowerCase() === '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'.toLowerCase()) return 6;
    if (tokenAddress.toLowerCase() === '0xdAC17F958D2ee523a2206206994597C13D831ec7'.toLowerCase()) return 6;
    return 18;
  };

  // 1. Live Activity Listener: Deposits
  useWatchContractEvent({
    address: CONTRACT_ADDRESS,
    abi: piggyBankArtifact.abi,
    eventName: 'Deposited',
    onLogs: (logs) => {
      logs.forEach((log: any) => {
        if (address && log.args.user?.toLowerCase() !== address.toLowerCase()) return;

        const tokenAddr = log.args.token || zeroAddress;
        const rawAmount = log.args.amount || 0n;
        const decimals = getAssetDecimals(tokenAddr);

        setHistory(prev => [
          {
            type: 'Deposit',
            amount: parseFloat(formatUnits(rawAmount, decimals)).toFixed(4),
            tokenSymbol: getAssetSymbol(tokenAddr),
            time: new Date().toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
            txHash: log.transactionHash
          },
          ...prev
          // Let the history list grow longer (up to 25 items) if the user is looking at the full dashboard tab view
        ].slice(0, fullView ? 25 : 8)); 
      });
    },
  });

  // 2. Live Activity Listener: Withdrawals
  useWatchContractEvent({
    address: CONTRACT_ADDRESS,
    abi: piggyBankArtifact.abi,
    eventName: 'Withdrawn',
    onLogs: (logs) => {
      logs.forEach((log: any) => {
        if (address && log.args.user?.toLowerCase() !== address.toLowerCase()) return;

        const tokenAddr = log.args.token || zeroAddress;
        const rawAmount = log.args.amount || 0n;
        const decimals = getAssetDecimals(tokenAddr);

        setHistory(prev => [
          {
            type: 'Withdrawal',
            amount: parseFloat(formatUnits(rawAmount, decimals)).toFixed(4),
            tokenSymbol: getAssetSymbol(tokenAddr),
            time: new Date().toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
            txHash: log.transactionHash
          },
          ...prev
        ].slice(0, fullView ? 25 : 8));
      });
    },
  });

  return (
    <Card className="glass-card border border-border/40 bg-card/60 backdrop-blur-xl shadow-2xl rounded-2xl overflow-hidden relative w-full">
      <CardHeader className="pb-4">
        <CardTitle className="text-xl font-black tracking-tight text-foreground flex items-center gap-2">
          <span>📜</span> {fullView ? 'Complete Vault Ledger' : 'Vault Live Activity'}
        </CardTitle>
      </CardHeader>
      
      <CardContent>
        {/* Dynamic design tweak: changes height limits depending on sidebar vs main tab workspace view */}
        <div 
          className={`space-y-2 overflow-y-auto pr-1 custom-scrollbar ${
            fullView ? 'max-h-[600px]' : 'max-h-[340px]'
          }`}
        >
          <AnimatePresence initial={false}>
            {history.length === 0 ? (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-12 flex flex-col items-center justify-center gap-2"
              >
                <span className="text-3xl opacity-40">📭</span>
                <p className="text-sm font-semibold text-muted-foreground">No recent local lifecycle events detected</p>
                <p className="text-xs text-muted-foreground/50 max-w-[200px]">On-chain adjustments will display here in real-time.</p>
              </motion.div>
            ) : (
              history.map((tx, i) => (
                <motion.div
                  key={tx.txHash + i}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  className="flex justify-between items-center p-3.5 bg-muted/40 border border-border/20 rounded-xl hover:bg-muted/60 transition-all group/item"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-black text-foreground">{tx.type}</p>
                      <Badge 
                        variant="outline" 
                        className={`text-[10px] font-bold h-4 px-1.5 select-none ${
                          tx.type === 'Deposit' 
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                            : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                        }`}
                      >
                        {tx.tokenSymbol}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
                      <span>{tx.time}</span>
                      <span>•</span>
                      <a 
                        href={`#`} 
                        className="font-mono hover:text-primary transition-colors hover:underline text-muted-foreground/60"
                        title={tx.txHash}
                      >
                        {tx.txHash.slice(0, 6)}...{tx.txHash.slice(-4)}
                      </a>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <p className={`font-mono text-base font-black ${
                      tx.type === 'Deposit' ? 'text-emerald-400' : 'text-orange-400'
                    }`}>
                      {tx.type === 'Deposit' ? '+' : '-'}{tx.amount}
                    </p>
                  </div>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>
      </CardContent>
    </Card>
  );
}