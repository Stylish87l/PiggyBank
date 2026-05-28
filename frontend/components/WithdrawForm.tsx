'use client';

import { useState, useEffect } from 'react';
import { useWriteContract } from 'wagmi';
import { parseUnits, zeroAddress } from 'viem';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

// Static import for your contract ABI to ensure Next.js bundle optimizations
import piggyBankArtifact from '@/abis/PiggyBank.json';

const CONTRACT_ADDRESS = '0x5FbDB2315678afecb367f032d93F642f64180aa3' as `0x${string}`;

const tokenList = [
  { symbol: 'ETH', address: zeroAddress, decimals: 18, price: 2450 },
  { symbol: 'USDC', address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48' as `0x${string}`, decimals: 6, price: 1.00 },
  { symbol: 'USDT', address: '0xdAC17F958D2ee523a2206206994597C13D831ec7' as `0x${string}`, decimals: 6, price: 1.00 },
  { symbol: 'DAI', address: '0x6B175474E89094C44Da98b954EedeAC495271d0F' as `0x${string}`, decimals: 18, price: 1.00 },
];

export default function WithdrawForm() {
  const { writeContract, isPending } = useWriteContract();
  const [amount, setAmount] = useState('');
  const [selectedToken, setSelectedToken] = useState(tokenList[0]);
  const [isEmergency, setIsEmergency] = useState(false);
  const [usdValue, setUsdValue] = useState(0);

  // Real-time USD evaluation calculation
  useEffect(() => {
    const value = parseFloat(amount || '0') * selectedToken.price;
    setUsdValue(value);
  }, [amount, selectedToken]);

  // Reset emergency banner if token selection changes
  useEffect(() => {
    setIsEmergency(false);
  }, [selectedToken]);

  const handleWithdraw = (emergencyMode: boolean) => {
    if (!amount) {
      toast.error('Please input a valid target configuration amount.');
      return;
    }

    // CRITICAL FIX: Dynamically handle token decimals (18 for ETH/DAI, 6 for USDC/USDT)
    const rawAmount = parseUnits(amount, selectedToken.decimals);

    writeContract({
      address: CONTRACT_ADDRESS,
      abi: piggyBankArtifact.abi,
      functionName: emergencyMode ? 'emergencyWithdraw' : 'withdraw',
      args: [selectedToken.address, rawAmount],
    }, {
      onSuccess: () => {
        toast.success(
          emergencyMode ? 'Emergency Withdrawal Executed' : 'Withdrawal Successful',
          { description: `${amount} ${selectedToken.symbol} successfully processed.` }
        );
        setAmount('');
        setIsEmergency(false);
      },
      onError: (error: any) => {
        toast.error(error.shortMessage || error.message || 'Execution error encountered.');
      },
    });
  };

  return (
    <Card className="glass-card border border-border/40 bg-card/60 backdrop-blur-xl shadow-2xl rounded-2xl overflow-hidden">
      <CardHeader>
        <CardTitle className="text-2xl flex items-center gap-3 font-black tracking-tight">
          <span>📤</span> Withdraw Assets
          {isEmergency && (
            <motion.span 
              initial={{ opacity: 0, x: -5 }}
              animate={{ opacity: 1, x: 0 }}
              className="text-red-400 text-sm font-bold tracking-wide uppercase bg-red-500/10 px-2.5 py-0.5 rounded-md border border-red-500/20"
            >
              Emergency Mode
            </motion.span>
          )}
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Token Selector Grid */}
        <div className="grid grid-cols-4 gap-2">
          {tokenList.map((token) => (
            <motion.button
              key={token.symbol}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setSelectedToken(token)}
              className={`py-3 rounded-xl text-sm font-bold tracking-wide cursor-pointer transition-all ${
                selectedToken.symbol === token.symbol
                  ? 'bg-primary text-primary-foreground shadow-lg shadow-purple-500/10'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {token.symbol}
            </motion.button>
          ))}
        </div>

        {/* Amount Input Module */}
        <div className="space-y-1">
          <label className="text-xs font-semibold text-muted-foreground block">
            Amount to Withdraw
          </label>
          <div className="relative">
            <Input
              type="number"
              step="0.0001"
              placeholder="0.0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="text-3xl py-7 font-mono font-bold"
            />
          </div>
          <p className="text-right text-xs font-bold text-muted-foreground tracking-tight mt-1">
            ≈ ${usdValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
          </p>
        </div>

        {/* Action Call Routing Block */}
        <div className="grid grid-cols-2 gap-4 pt-2">
          <Button 
            onClick={() => { setIsEmergency(false); handleWithdraw(false); }}
            disabled={isPending || !amount}
            className="w-full h-14 text-base font-black tracking-wide rounded-xl bg-gradient-to-r from-purple-600 to-indigo-500 cursor-pointer text-white"
          >
            Standard Withdraw
          </Button>

          <Button 
            variant="destructive"
            onClick={() => { setIsEmergency(true); handleWithdraw(true); }}
            disabled={isPending || !amount}
            className="w-full h-14 text-base font-black tracking-wide rounded-xl cursor-pointer"
          >
            Emergency Exit
          </Button>
        </div>

        {/* Context-Specific Danger Alerts */}
        {isEmergency && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Alert className="border-destructive/40 bg-destructive/10 rounded-xl">
              <AlertDescription className="text-destructive font-semibold text-xs leading-relaxed">
                ⚠️ Warning: This will penalize your balance with a 1% fee and enforce an immediate 7-day deposit freeze cooldown on your account address.
              </AlertDescription>
            </Alert>
          </motion.div>
        )}

        <p className="text-xs text-center text-muted-foreground font-medium pt-2">
          All transactions are bound to the smart contract’s active locking maturity status.
        </p>
      </CardContent>
    </Card>
  );
}