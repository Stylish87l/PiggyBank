'use client';

import { useState, useEffect } from 'react';
import { useWriteContract, useAccount } from 'wagmi';
import { parseUnits, zeroAddress, isAddress } from 'viem';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { Coins } from 'lucide-react';
import piggyBankArtifact from '@/abis/PiggyBank.json';

const CONTRACT_ADDRESS = (process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || '0x5FbDB2315678afecb367f032d93F642f64180aa3') as `0x${string}`;

interface TokenMetadata {
  symbol: string;
  address: `0x${string}`;
  decimals: number;
  price: number;
}

const tokenList: TokenMetadata[] = [
  { symbol: 'ETH', address: zeroAddress, decimals: 18, price: 2450 },
  { symbol: 'USDC', address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', decimals: 6, price: 1.00 },
  { symbol: 'USDT', address: '0xdAC17F958D2ee523a2206206994597C13D831ec7', decimals: 6, price: 1.00 },
  { symbol: 'DAI', address: '0x6B175474E89094C44Da98b954EedeAC495271d0F', decimals: 18, price: 1.00 },
  { symbol: 'WBTC', address: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599', decimals: 8, price: 62000 },
  { symbol: 'LINK', address: '0x514910771AF9Ca656af840dff83E8264EcF986CA', decimals: 18, price: 13.50 },
];

export default function DepositForm() {
  const { address } = useAccount();
  const { writeContract, isPending } = useWriteContract();
  
  const [amount, setAmount] = useState('');
  const [selectedToken, setSelectedToken] = useState<TokenMetadata>(tokenList[0]);
  const [customAddress, setCustomAddress] = useState('');
  const [showCustom, setShowCustom] = useState(false);
  const [usdValue, setUsdValue] = useState(0);

  useEffect(() => {
    const value = parseFloat(amount || '0') * selectedToken.price;
    setUsdValue(value);
  }, [amount, selectedToken]);

  const handleDeposit = async () => {
    if (!amount || !address) {
      toast.error('Please connect wallet and enter a valid amount.');
      return;
    }

    // Determine absolute token contract target path
    const tokenAddr = showCustom && isAddress(customAddress) ? (customAddress as `0x${string}`) : selectedToken.address;
    
    if (showCustom && !isAddress(customAddress)) {
      toast.error('Invalid Custom Token Address format.');
      return;
    }

    // Dynamically safely calculate units based on individual asset properties
    const decimals = showCustom ? 18 : selectedToken.decimals; 
    const parsedAmount = parseUnits(amount, decimals);

    writeContract({
      address: CONTRACT_ADDRESS,
      abi: piggyBankArtifact.abi,
      functionName: 'deposit',
      // Third parameter represents optional duration locks initialized at zero block time
      args: [tokenAddr, parsedAmount, 0n],
      value: tokenAddr === zeroAddress ? parsedAmount : undefined,
    }, {
      onSuccess: (txHash) => {
        toast.success(`Deposit Sent Successfully!`, {
          description: `Locked ${amount} ${selectedToken.symbol} (≈ $${usdValue.toLocaleString(undefined, { minimumFractionDigits: 2 })} USD)`,
        });
        setAmount('');
        setCustomAddress('');
      },
      onError: (error: any) => {
        const errorMsg = error.shortMessage || error.message || 'Transaction failed execution';
        toast.error(errorMsg);
      },
    });
  };

  return (
    <Card className="glass-card border border-border/40 bg-card/60 backdrop-blur-xl shadow-2xl rounded-2xl overflow-hidden relative">
      <CardHeader className="pb-4">
        <CardTitle className="text-xl font-black tracking-tight text-foreground flex items-center gap-2">
          <span>📥</span> Multi-Asset Deposit
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-5">
        <div>
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-3">
            Select Asset Pool
          </label>
          <div className="grid grid-cols-3 gap-2">
            {tokenList.map((token) => (
              <motion.button
                key={token.symbol}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => { setSelectedToken(token); setShowCustom(false); }}
                className={`p-2.5 rounded-xl text-sm font-bold tracking-wide transition-all border cursor-pointer ${
                  selectedToken.symbol === token.symbol && !showCustom
                    ? 'bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20'
                    : 'bg-muted/40 text-foreground border-border/40 hover:bg-muted/80'
                }`}
              >
                {token.symbol}
              </motion.button>
            ))}
          </div>
          
          <div className="mt-3 flex justify-end">
            <button
              onClick={() => { setShowCustom(!showCustom); setSelectedToken({ symbol: 'CUSTOM', address: zeroAddress, decimals: 18, price: 0 }); }}
              className={`text-xs font-bold transition-colors cursor-pointer hover:underline ${showCustom ? 'text-primary' : 'text-muted-foreground'}`}
            >
              {showCustom ? '← Use Core Token Presets' : '➕ Deposit Unlisted ERC-20 Asset'}
            </button>
          </div>
        </div>

        {showCustom && (
          <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="space-y-1">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">Custom Token Contract Address</label>
            <Input
              placeholder="0x..."
              value={customAddress}
              onChange={(e) => setCustomAddress(e.target.value)}
              className="font-mono bg-muted/20 border-border/50 h-11 rounded-xl"
            />
          </motion.div>
        )}

        <div className="space-y-1">
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">
            Deposit Amount
          </label>
          <div className="relative">
            <Input
              type="number"
              step="any"
              placeholder="0.0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="text-2xl h-14 pl-4 pr-16 font-mono font-bold bg-muted/20 border-border/50 rounded-xl"
            />
            <div className="absolute right-4 top-1/2 -translate-y-1/2 font-bold text-sm text-muted-foreground select-none">
              {showCustom ? 'Tokens' : selectedToken.symbol}
            </div>
          </div>
          {!showCustom && (
            <p className="text-right text-xs font-semibold text-emerald-400 tabular-nums">
              ≈ ${usdValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
            </p>
          )}
        </div>

        {selectedToken.address !== zeroAddress && (
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-xs font-medium text-amber-500 leading-normal">
            ⚠️ <strong>Notice:</strong> Ensure you have provided an explicit ERC-20 token contract approval allocation to this vault before launching the deposit sequence.
          </div>
        )}

        <Button 
          onClick={handleDeposit} 
          disabled={isPending || !amount}
          className="w-full h-12 text-base font-black tracking-wide rounded-xl bg-gradient-to-r from-purple-600 to-indigo-500 hover:opacity-95 text-white transition-opacity cursor-pointer shadow-lg shadow-purple-500/10"
        >
          {isPending ? 'Processing On-Chain...' : `Deposit ${showCustom ? 'Custom Token' : selectedToken.symbol}`}
        </Button>
      </CardContent>
    </Card>
  );
}