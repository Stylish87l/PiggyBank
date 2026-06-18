'use client';

import { useAccount } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import { Sun, Moon, Download, Lock, ArrowDownToLine, ArrowUpFromLine, ScrollText, Hourglass } from 'lucide-react';

import AssetOverview from '@/components/AssetOverview';
import CountdownTimer from '@/components/CountdownTimer';
import DepositForm from '@/components/DepositForm';
import LockForm from '@/components/LockForm';
import WithdrawForm from '@/components/WithdrawForm';
import TransactionHistory from '@/components/TransactionHistory';
import VaultStatusBar from '@/components/VaultStatusBar';

const TABS = [
  { value: 'lock',     label: 'Lock',     Icon: Lock },
  { value: 'deposit',  label: 'Deposit',  Icon: ArrowDownToLine },
  { value: 'withdraw', label: 'Withdraw', Icon: ArrowUpFromLine },
  { value: 'history',  label: 'Activity', Icon: ScrollText },
] as const;

function useDarkMode() {
  const [isDark, setIsDark] = useState(true);
  
  useEffect(() => { 
    if (typeof window !== 'undefined' && document.documentElement) {
      setIsDark(document.documentElement.classList.contains('dark')); 
    }
  }, []);

  const toggle = () => {
    const next = !isDark;
    setIsDark(next);
    if (typeof window !== 'undefined' && document.documentElement) {
      document.documentElement.classList.toggle('dark', next);
      try { localStorage.setItem('piggybank-theme', next ? 'dark' : 'light'); } catch {}
    }
  };
  return { isDark, toggle };
}

function useInstallPrompt() {
  const [prompt, setPrompt] = useState<any>(null);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handler = (e: Event) => { e.preventDefault(); setPrompt(e); };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);
  const install = async () => { if (!prompt) return; prompt.prompt(); await prompt.userChoice; setPrompt(null); };
  return { canInstall: !!prompt, install };
}

export default function VaultDashboard() {
  const { address, isConnected } = useAccount();
  const { isDark, toggle } = useDarkMode();
  const { canInstall, install } = useInstallPrompt();
  const [activeTab, setActiveTab] = useState<string>('lock');

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] pb-20 transition-colors duration-300">

      {/* ── Ambient background orbs ── */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden -z-10" aria-hidden>
        <div className="absolute top-[-20%] left-[-10%] w-[700px] h-[700px] rounded-full bg-purple-600/10 dark:bg-purple-500/8 blur-[140px]" />
        <div className="absolute bottom-[-15%] right-[-5%] w-[600px] h-[600px] rounded-full bg-cyan-500/8 dark:bg-cyan-400/6 blur-[120px]" />
        <div className="absolute top-[40%] left-[55%] w-[400px] h-[400px] rounded-full bg-indigo-500/6 dark:bg-indigo-400/5 blur-[90px]" />
        
        <div
          className="absolute inset-0 opacity-[0.025] dark:opacity-[0.04]"
          style={{
            backgroundImage: 'linear-gradient(rgba(147,51,234,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(147,51,234,0.4) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-8 pt-6 md:pt-10">

        {/* ── Header ── */}
        <motion.header
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
          className="flex justify-between items-center mb-10 md:mb-14 pb-5 border-b border-[var(--border)]"
        >
          {/* Restored App Icon Block with Stable Layout Animations */}
          <div className="flex items-center gap-3 md:gap-4">
            <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-purple-500/20 text-2xl md:text-3xl select-none">
              <motion.span 
                animate={{ scale: [1, 1.12, 1] }}
                transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}
                className="inline-block"
              >
                🐷
              </motion.span>
            </div>
            <div>
              <h1
                className="font-display text-3xl md:text-4xl font-extrabold tracking-tight leading-none"
                style={{
                  backgroundImage: isDark
                    ? 'linear-gradient(135deg, #c084fc 0%, #818cf8 50%, #67e8f9 100%)'
                    : 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 50%, #0891b2 100%)',
                  WebkitBackgroundClip: 'text',
                  backgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                PIGGYBANK
              </h1>
              <p className="text-[10px] md:text-xs font-bold tracking-[0.2em] uppercase text-[var(--muted-foreground)] mt-1">
                v2 · Time-Locked Vault
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 md:gap-3">
            <AnimatePresence>
              {canInstall && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.85 }}
                  onClick={install}
                  className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border border-[var(--border)] bg-[var(--muted)] text-[var(--foreground)] hover:bg-purple-500/10 hover:border-purple-500/30 transition-all cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  Install
                </motion.button>
              )}
            </AnimatePresence>

            <motion.button
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.93 }}
              onClick={toggle}
              aria-label="Toggle dark mode"
              className="w-9 h-9 md:w-10 md:h-10 rounded-xl border border-[var(--border)] bg-[var(--muted)] flex items-center justify-center text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-purple-500/10 hover:border-purple-500/30 transition-all cursor-pointer"
            >
              <AnimatePresence mode="wait" initial={false}>
                {isDark ? (
                  <motion.span key="sun" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.2 }}>
                    <Sun className="w-4 h-4" />
                  </motion.span>
                ) : (
                  <motion.span key="moon" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.2 }}>
                    <Moon className="w-4 h-4" />
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.button>

            <ConnectButton showBalance={false} />
          </div>
        </motion.header>

        {/* ── Disconnected landing ── */}
        {!isConnected ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="flex flex-col items-center justify-center min-h-[60vh] text-center max-w-xl mx-auto py-12 gap-8"
          >
            <motion.div
              animate={{ y: [0, -12, 0] }}
              transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut' }}
              className="relative"
            >
              <div className="absolute inset-0 rounded-full bg-purple-500/20 blur-2xl scale-150" />
              <span className="relative text-8xl md:text-9xl select-none">🔐</span>
            </motion.div>

            <div className="space-y-4">
              <h2 className="font-display text-4xl md:text-6xl font-extrabold tracking-tight text-[var(--foreground)] leading-[1.05]">
                Lock Today.
                <br />
                <span style={{
                  backgroundImage: isDark ? 'linear-gradient(135deg, #c084fc, #22d3ee)' : 'linear-gradient(135deg, #7c3aed, #0891b2)',
                  WebkitBackgroundClip: 'text', backgroundClip: 'text', WebkitTextFillColor: 'transparent',
                }}>
                  Thank Yourself Tomorrow.
                </span>
              </h2>
              <p className="text-sm md:text-base text-[var(--muted-foreground)] leading-relaxed max-w-sm mx-auto">
                A time-locked savings vault that protects your assets from impulse — engineered for disciplined wealth building.
              </p>
            </div>

            {/* Fixed How it Works execution arrays */}
            <div className="w-full max-w-sm glass-card lightning-edge rounded-2xl p-5 text-left space-y-3">
              <p className="text-xs font-bold uppercase tracking-widest text-[var(--muted-foreground)] mb-4 relative z-10">How it works</p>
              {[
                { step: '1', Icon: Lock, label: 'Set a lock duration' },
                { step: '2', Icon: ArrowDownToLine, label: 'Deposit ETH or ERC-20 tokens' },
                { step: '3', Icon: Hourglass, label: 'Wait for the lock to expire' },
                { step: '4', Icon: ArrowUpFromLine, label: 'Withdraw your savings' }
              ].map(({ step, Icon, label }, idx) => (
                <motion.div
                  key={step}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 + idx * 0.08 }}
                  className="flex items-center gap-3 relative z-10"
                >
                  <span className="w-6 h-6 rounded-lg bg-purple-500/15 border border-purple-500/25 text-purple-500 dark:text-purple-400 flex items-center justify-center text-[11px] font-black shrink-0">
                    {step}
                  </span>
                  <Icon className="w-3.5 h-3.5 text-purple-400/70 shrink-0" />
                  <span className="text-sm text-[var(--muted-foreground)] font-medium">{label}</span>
                </motion.div>
              ))}
            </div>

            <div className="flex flex-col items-center gap-3">
              <ConnectButton />
              {canInstall && (
                <button onClick={install} className="flex items-center gap-2 text-xs font-semibold text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors cursor-pointer">
                  <Download className="w-3.5 h-3.5" />
                  Add to Home Screen
                </button>
              )}
            </div>
          </motion.div>

        ) : (
          /* ── Connected dashboard ── */
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
            className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8 items-start"
          >
            {/* ── Sidebar ── */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="lg:col-span-5 space-y-5 w-full"
            >
              <AssetOverview address={address!} />
              <CountdownTimer address={address!} />
              <TransactionHistory address={address!} />
            </motion.div>

            {/* ── Main panel ── */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.15 }}
              className="lg:col-span-7 w-full space-y-4"
            >
              <VaultStatusBar address={address!} />

              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList
                  className="w-full grid grid-cols-4 gap-1.5 p-1.5 mb-5 rounded-2xl h-auto"
                  style={{ background: 'var(--muted)', border: '1px solid var(--border)' }}
                >
                  {TABS.map(({ value, label, Icon }, idx) => {
                    const isActive = activeTab === value;
                    return (
                      <TabsTrigger
                        key={value}
                        value={value}
                        className="relative flex flex-col sm:flex-row items-center gap-1 sm:gap-1.5 font-bold py-3 px-2 rounded-xl text-xs cursor-pointer transition-all text-[var(--muted-foreground)] data-[state=active]:text-white data-[state=active]:shadow-lg overflow-hidden"
                        style={{ fontFamily: 'Syne, sans-serif' }}
                      >
                        {isActive && (
                          <motion.span
                            layoutId="tab-active-bg"
                            className="absolute inset-0 rounded-xl"
                            style={{ background: 'linear-gradient(135deg, #9333ea 0%, #6d28d9 60%, #4f46e5 100%)' }}
                            transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }}
                          />
                        )}
                        <span className={`relative z-10 w-4 h-4 rounded-md flex items-center justify-center text-[9px] font-black shrink-0 ${isActive ? 'bg-white/20 text-white' : 'bg-purple-500/15 text-purple-500 dark:text-purple-400'}`}>
                          {idx + 1}
                        </span>
                        <Icon className="relative z-10 w-3.5 h-3.5 shrink-0" />
                        <span className="relative z-10 leading-none hidden sm:inline">{label}</span>
                      </TabsTrigger>
                    );
                  })}
                </TabsList>

                <TabsContent value="lock"     className="outline-none mt-0"><LockForm /></TabsContent>
                <TabsContent value="deposit"  className="outline-none mt-0"><DepositForm /></TabsContent>
                <TabsContent value="withdraw" className="outline-none mt-0"><WithdrawForm /></TabsContent>
                <TabsContent value="history"  className="outline-none mt-0"><TransactionHistory address={address!} fullView /></TabsContent>
              </Tabs>
            </motion.div>
          </motion.div>
        )}
      </div>
    </div>
  );
}