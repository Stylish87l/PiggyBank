'use client';

import { useState } from 'react';
import { useWriteContract, useAccount } from 'wagmi';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import piggyBankArtifact from '@/abis/PiggyBank.json';

const CONTRACT_ADDRESS = (process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || '0x5FbDB2315678afecb367f032d93F642f64180aa3') as `0x${string}`;

export default function LockForm() {
  const { address } = useAccount();
  const { writeContract, isPending } = useWriteContract();
  const [days, setDays] = useState('30');

  const handleLock = () => {
    if (!address) {
      toast.error('Please connect your wallet first.');
      return;
    }

    const numericDays = Number(days);
    if (isNaN(numericDays) || numericDays <= 0) {
      toast.error('Please specify a valid number of days.');
      return;
    }

    // Convert days directly to on-chain epoch seconds
    const durationSeconds = BigInt(Math.floor(numericDays * 86400));
    const targetUnlockTimestamp = BigInt(Math.floor(Date.now() / 1000)) + durationSeconds;

    writeContract({
      address: CONTRACT_ADDRESS,
      abi: piggyBankArtifact.abi,
      functionName: 'setOrExtendLock',
      args: [targetUnlockTimestamp],
    }, {
      onSuccess: () => {
        toast.success('Lock Period Updated Successfully!', {
          description: `Your vault assets are securely locked for another ${days} days.`
        });
      },
      onError: (err: any) => {
        const errorMsg = err.shortMessage || err.message || 'Failed to update lock configuration';
        toast.error(errorMsg);
      },
    });
  };

  const dayPresets = [7, 30, 90, 180, 365];

  return (
    <Card className="glass-card border border-border/40 bg-card/60 backdrop-blur-xl shadow-2xl rounded-2xl overflow-hidden relative">
      <CardHeader className="pb-4">
        <CardTitle className="text-xl font-black tracking-tight text-foreground flex items-center gap-2">
          <span>⏱️</span> Set / Extend Lock
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-5">
        <div className="space-y-1">
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-2">
            Lock Duration (Days)
          </label>
          <Input
            type="number"
            min="1"
            step="1"
            value={days}
            onChange={(e) => setDays(e.target.value)}
            placeholder="Specify duration"
            className="text-2xl h-14 pl-4 font-mono font-bold bg-muted/20 border-border/50 rounded-xl"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">
            Quick Presets
          </label>
          <div className="flex flex-wrap gap-2">
            {dayPresets.map((d) => {
              const isActive = days === d.toString();
              return (
                <motion.button
                  key={d}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  type="button"
                  onClick={() => setDays(d.toString())}
                  className={`px-4 py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                    isActive
                      ? 'bg-primary border-primary text-primary-foreground shadow-md shadow-primary/10'
                      : 'bg-muted/30 border-border/40 text-foreground hover:bg-muted/70'
                  }`}
                >
                  {d === 365 ? '📅 1 Year' : `${d} Days`}
                </motion.button>
              );
            })}
          </div>
        </div>

        {Number(days) > 0 && (
          <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-3.5 text-xs font-medium text-blue-400 leading-normal">
            ⏳ <strong>Ironclad Enforcement:</strong> This will commit your assets to deep freezing until approximately{' '}
            <span className="font-bold underline text-blue-300">
              {new Date(Date.now() + Number(days) * 86400 * 1000).toLocaleDateString(undefined, {
                weekday: 'short',
                year: 'numeric',
                month: 'short',
                day: 'numeric'
              })}
            </span>
            . You will not be allowed to recall any deposits before this milestone passes.
          </div>
        )}

        <Button 
          onClick={handleLock} 
          disabled={isPending || !days}
          className="w-full h-12 text-base font-black tracking-wide rounded-xl bg-gradient-to-r from-purple-600 to-indigo-500 hover:opacity-95 text-white transition-opacity cursor-pointer shadow-lg shadow-purple-500/10"
        >
          {isPending ? 'Broadcasting Lock Extension...' : 'Confirm Lock Period'}
        </Button>
      </CardContent>
    </Card>
  );
}