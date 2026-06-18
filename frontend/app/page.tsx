'use client';

import { useState, useEffect } from 'react';
import VaultDashboard from '@/components/VaultDashboard';

export default function Home() {
  const [isMounted, setIsMounted] = useState(false);

  // This hook only runs on the client side *after* the browser page has successfully loaded
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Show a clean dark fallback frame on mobile while the DOM stabilizes
  if (!isMounted) {
    return (
      <div className="min-h-screen bg-[#080613] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return <VaultDashboard />;
}