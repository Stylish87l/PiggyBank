'use client';

import { useAccount } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { motion } from 'framer-motion';

// Clean absolute root imports for your modular components
import AssetOverview from '@/components/AssetOverview';
import CountdownTimer from '@/components/CountdownTimer';
import DepositForm from '@/components/DepositForm';
import LockForm from '@/components/LockForm';
import WithdrawForm from '@/components/WithdrawForm';
import TransactionHistory from '@/components/TransactionHistory';

export default function VaultDashboard() {
  const { address, isConnected } = useAccount();

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors pb-16">
      <div className="max-w-7xl mx-auto px-6 pt-10">
        
        {/* Header Section */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="flex justify-between items-center mb-16 pb-6 border-b border-border/40"
        >
          <div className="flex items-center gap-6">
            <motion.div
              animate={{ rotate: [0, 12, -12, 0] }}
              transition={{ repeat: Infinity, duration: 6, ease: 'easeInOut' }}
              className="w-20 h-20 rounded-3xl bg-gradient-to-br from-purple-600 via-violet-600 to-cyan-400 flex items-center justify-center text-6xl shadow-xl shadow-purple-500/10 select-none"
            >
              🐷
            </motion.div>
            <div>
              <h1 className="text-5xl md:text-6xl font-black tracking-tighter bg-gradient-to-r from-purple-400 to-indigo-400 bg-clip-text text-transparent">
                PIGGYBANK
              </h1>
              <p className="text-purple-400 text-sm md:text-base font-bold tracking-wider mt-1">
                v2 • FUTURE-PROOF SAVINGS VAULT
              </p>
            </div>
          </div>
          <ConnectButton showBalance={false} />
        </motion.div>

        {/* Locked Gateway (Wallet Disconnected State) */}
        {!isConnected ? (
          <div className="flex flex-col items-center justify-center min-h-[55vh] text-center max-w-xl mx-auto py-12">
            <motion.div 
              animate={{ scale: [1, 1.12, 1] }} 
              transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
              className="text-[120px] mb-8 select-none"
            >
              🔐
            </motion.div>
            <h2 className="text-4xl md:text-5xl font-black tracking-tight text-foreground mb-6 leading-tight">
              Lock Today.<br />Thank Yourself Tomorrow.
            </h2>
            <p className="text-base md:text-lg text-muted-foreground leading-relaxed mb-10">
              A beautiful, secure time-locked vault engineered for disciplined wealth building.
            </p>
            <ConnectButton />
          </div>
        ) : (
          /* Active Dashboard Layout (Wallet Connected State) */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
            
            {/* Sidebar Columns - Overview Metrics & History Panel */}
            <div className="lg:col-span-5 space-y-8 w-full">
              <AssetOverview address={address!} />
              <CountdownTimer address={address!} />
              <TransactionHistory address={address!} />
            </div>

            {/* Main Action Forms Panel Area */}
            <div className="lg:col-span-7 w-full">
              <Tabs defaultValue="deposit" className="w-full">
                <TabsList className="w-full grid grid-cols-4 bg-muted border border-border/40 p-1.5 mb-8 rounded-xl h-auto">
                  <TabsTrigger value="deposit" className="font-bold py-2.5 rounded-lg cursor-pointer transition-all data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                    Deposit
                  </TabsTrigger>
                  <TabsTrigger value="lock" className="font-bold py-2.5 rounded-lg cursor-pointer transition-all data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                    Lock Time
                  </TabsTrigger>
                  <TabsTrigger value="withdraw" className="font-bold py-2.5 rounded-lg cursor-pointer transition-all data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                    Withdraw
                  </TabsTrigger>
                  <TabsTrigger value="history" className="font-bold py-2.5 rounded-lg cursor-pointer transition-all data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                    Activity
                  </TabsTrigger>
                </TabsList>

                {/* Sub-form rendering contents */}
                <TabsContent value="deposit" className="outline-none mt-0">
                  <DepositForm />
                </TabsContent>
                
                <TabsContent value="lock" className="outline-none mt-0">
                  <LockForm />
                </TabsContent>
                
                <TabsContent value="withdraw" className="outline-none mt-0">
                  <WithdrawForm />
                </TabsContent>
                
                <TabsContent value="history" className="outline-none mt-0">
                  {/* Preserving your exact fullView tracking prop pass */}
                  <TransactionHistory address={address!} fullView />
                </TabsContent>
              </Tabs>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}