'use client';

import { useReadContract, useReadContracts } from 'wagmi';
import { zeroAddress } from 'viem';
import piggyBankArtifact from '@/abis/PiggyBank.json';
import { CONTRACT_ADDRESS } from './constants';

const abi = piggyBankArtifact.abi as any;

/**
 * Single hook that owns all on-chain reads for a connected user.
 * Call `refetch()` after any write transaction to keep UI fresh.
 */
export function useVaultData(address: `0x${string}` | undefined) {
  const enabled = !!address;

  const { data, refetch, isLoading } = useReadContracts({
    contracts: [
      {
        address: CONTRACT_ADDRESS,
        abi,
        functionName: 'getBalance',
        args: [address ?? zeroAddress, zeroAddress], // ETH balance
      },
      {
        address: CONTRACT_ADDRESS,
        abi,
        functionName: 'getUnlockTime',
        args: [address ?? zeroAddress],
      },
      {
        address: CONTRACT_ADDRESS,
        abi,
        functionName: 'isCooldownActive',
        args: [address ?? zeroAddress],
      },
      {
        address: CONTRACT_ADDRESS,
        abi,
        functionName: 'emergencyFeeBps',
        args: [],
      },
      {
        address: CONTRACT_ADDRESS,
        abi,
        functionName: 'emergencyExitEnabled',
        args: [],
      },
      {
        address: CONTRACT_ADDRESS,
        abi,
        functionName: 'getActiveAssets',
        args: [address ?? zeroAddress],
      },
    ],
    query: { enabled, refetchInterval: 30_000 },
  });

  const ethBalance = (data?.[0]?.result ?? 0n) as bigint;
  const unlockTime = Number((data?.[1]?.result ?? 0n) as bigint);
  const cooldownActive = (data?.[2]?.result ?? false) as boolean;
  const emergencyFeeBps = Number((data?.[3]?.result ?? 100n) as bigint);
  const emergencyExitEnabled = (data?.[4]?.result ?? false) as boolean;
  const activeAssets = (data?.[5]?.result ?? []) as `0x${string}`[];

  const isLocked = unlockTime > 0 && unlockTime > Math.floor(Date.now() / 1000);
  const hasLock = unlockTime > 0;
  /** Emergency fee as a human-readable percentage, e.g. 100 bps → "1.00%" */
  const emergencyFeePercent = (emergencyFeeBps / 100).toFixed(2);

  return {
    ethBalance,
    unlockTime,
    cooldownActive,
    emergencyFeeBps,
    emergencyFeePercent,
    emergencyExitEnabled,
    activeAssets,
    isLocked,
    hasLock,
    isLoading,
    refetch,
  };
}