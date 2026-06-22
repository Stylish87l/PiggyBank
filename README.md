<div align="center">

# 🐷 PiggyBank

### A time-locked crypto vault that protects your assets from impulse.

**Lock today. Thank yourself tomorrow.**

[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Solidity](https://img.shields.io/badge/Solidity-0.8.28-363636?logo=solidity)](https://soliditylang.org/)
[![wagmi](https://img.shields.io/badge/wagmi-v2-orange)](https://wagmi.sh/)
[![RainbowKit](https://img.shields.io/badge/RainbowKit-2-9333ea)](https://www.rainbowkit.com/)
[![Network](https://img.shields.io/badge/Network-Sepolia%20Testnet-cyan)](https://sepolia.etherscan.io/)
[![Deploy](https://img.shields.io/badge/Deployed%20on-Vercel-black?logo=vercel)](https://vercel.com/)
[![License](https://img.shields.io/badge/License-MIT-green)](#license)

</div>

---

## Overview

**PiggyBank** is a decentralized, time-locked savings vault. You set a lock period, deposit ETH or supported ERC-20 tokens, and the vault simply won't let you withdraw until that period expires — short of paying an emergency-exit fee for early access. It's a small piece of financial discipline, enforced by a smart contract instead of willpower.

The app is built as a full-stack Web3 product: a Solidity vault contract deployed on Ethereum Sepolia, paired with a Next.js frontend that handles wallet connection, multi-asset deposits, live balance tracking, and on-chain transaction history — all wrapped in a custom glassmorphic UI.

> 🚧 **Status:** Actively in development and currently deployed on the **Sepolia testnet** for testing. Not yet audited — do not use with real funds on mainnet.

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [How It Works](#how-it-works)
- [Smart Contract](#smart-contract)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Project Structure](#project-structure)
- [Deployment](#deployment)
- [Security Considerations](#security-considerations)
- [Roadmap](#roadmap)
- [Contributing](#contributing)
- [License](#license)

---

## Features

**Time-Locked Vault**
Set a lock duration (minimum 7 days, with quick presets for 7/30/90/180/365 days), or extend an existing lock further into the future. Assets stay locked until that timestamp passes.

**Multi-Asset Deposits**
Deposit native ETH or any listed ERC-20 token (USDC, USDT, DAI, WBTC, LINK), plus support for depositing unlisted ERC-20 tokens by contract address. ERC-20 approvals are handled inline before deposit.

**Standard & Emergency Withdrawals**
Withdraw normally once your lock expires, or trigger an emergency exit before expiry for a configurable penalty fee — with a cooldown period enforced between emergency withdrawals.

**Live Portfolio Tracking**
Real-time USD valuation of holdings via live price feeds, with visible cache/live status so you always know whether you're looking at fresh or stale pricing.

**On-Chain Activity Feed**
A live, real-time transaction history built from watched contract events (`Deposited`, `Withdrawn`, `EmergencyWithdrawn`), backfilled with historical logs and cached locally per wallet.

**Wallet-Native UX**
Built on RainbowKit + wagmi + WalletConnect v2 for broad wallet support, with a polished connect flow, network indicator, and PWA install support for adding PiggyBank to your home screen.

**Light & Dark Mode**
Full theme support with a flash-free dark mode (applied before first paint) and a persistent user preference.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | [Next.js 16](https://nextjs.org/) (App Router) |
| Language | TypeScript |
| Wallet & Chain | [wagmi v2](https://wagmi.sh/), [viem](https://viem.sh/), [RainbowKit](https://www.rainbowkit.com/), [WalletConnect v2](https://walletconnect.com/) |
| Data Fetching / Cache | [TanStack Query](https://tanstack.com/query) |
| Smart Contract | Solidity ^0.8.28, OpenZeppelin (`Ownable`, `Pausable`, `ReentrancyGuard`, `SafeERC20`) |
| Network | Ethereum Sepolia (testnet) |
| Styling | Tailwind CSS v4, custom design tokens |
| Animation | Framer Motion |
| UI Primitives | Radix UI / shadcn |
| Deployment | Vercel |

---

## How It Works

1. **Connect your wallet** — any wallet supported by WalletConnect v2 or browser injection.
2. **Set a lock period** — choose a duration (7 days minimum); your assets will be locked until that date.
3. **Deposit** — send ETH or an approved ERC-20 token into the vault.
4. **Wait** — the countdown timer tracks time remaining until unlock.
5. **Withdraw** — once unlocked, withdraw freely. Need it sooner? Use the emergency exit for a fee.

```
 Connect Wallet → Set Lock → Deposit Assets → Lock Period Elapses → Withdraw
                                     │
                                     └──→ Emergency Exit (fee + cooldown)
```

---

## Smart Contract

The vault contract (`PiggyBank.sol`) handles all custody and lock logic on-chain. Key behaviors:

- **Per-user lock timestamps** — each address has its own unlock time, set via `setOrExtendLock`, which can only ever move forward in time.
- **Multi-asset balances** — `getBalance(user, token)` tracks holdings per user per token (use the zero address for native ETH).
- **Emergency exit** — `emergencyWithdraw` allows early withdrawal at the cost of a fee (`emergencyFeeBps`, capped at `MAX_FEE_BPS`), with a mandatory cooldown (`EMERGENCY_COOLDOWN`) afterward. Can be globally disabled by the owner via `setEmergencyEnabled`.
- **Permit support** — `depositWithPermit` allows gas-efficient ERC-20 deposits using EIP-2612 signatures, skipping a separate approval transaction.
- **Batch operations** — `batchWithdraw` / `batchEmergencyWithdraw` for withdrawing multiple assets in a single transaction.
- **Admin controls** — owner-only `pause`/`unpause`, treasury management, and fee sweeping, built on OpenZeppelin's `Ownable` and `Pausable`.
- **Reentrancy protection** — all value-transferring functions are guarded.

| Constant | Value |
|---|---|
| Minimum lock duration | 7 days |
| Minimum lock extension | 1 day |
| Minimum emergency withdrawal amount | 0.001 ETH equivalent |
| Maximum fee | 25% (2500 bps) |
| Max asset types per user | 25 |
| Emergency cooldown | 7 days |

> The ABI is checked into the repo at `abis/PiggyBank.json` and consumed directly by the frontend's wagmi hooks.

---

## Getting Started

### Prerequisites

- Node.js 18+
- npm (or your package manager of choice)
- A WalletConnect Cloud project ID ([cloud.walletconnect.com](https://cloud.walletconnect.com/))
- An RPC endpoint for Sepolia (e.g. [Alchemy](https://www.alchemy.com/) or [Infura](https://www.infura.io/)) — recommended over relying on public defaults
- A wallet with Sepolia testnet ETH ([sepoliafaucet.com](https://sepoliafaucet.com/))

### Installation

```bash
git clone https://github.com/<your-username>/piggybank.git
cd piggybank
npm install
```

### Running locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and connect a wallet set to the Sepolia network.

### Build for production

```bash
npm run build
npm run start
```

---

## Environment Variables

Create a `.env.local` file in the project root:

```bash
# Required — your deployed PiggyBank contract address on Sepolia
NEXT_PUBLIC_CONTRACT_ADDRESS=0x...

# Required — WalletConnect Cloud project ID
# Make sure your production domain is added to the project's allowed domains
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id

# Recommended — dedicated RPC endpoints (avoid relying on public defaults)
NEXT_PUBLIC_RPC_SEPOLIA=https://sepolia.infura.io/v3/your_key
NEXT_PUBLIC_RPC_BASE=https://base-mainnet.infura.io/v3/your_key
NEXT_PUBLIC_RPC_MAINNET=https://mainnet.infura.io/v3/your_key
```

> ⚠️ When deploying, set these in your hosting provider's **production** environment settings as well — local `.env.local` values are not automatically carried over to Vercel.

---

## Project Structure

```
.
├── app/
│   ├── layout.tsx          # Root layout, theme bootstrap, PWA metadata
│   ├── page.tsx            # Entry point → VaultDashboard
│   ├── providers.tsx       # Wagmi / RainbowKit / TanStack Query providers
│   └── globals.css         # Design tokens, animations, utility classes
├── components/
│   ├── VaultDashboard.tsx  # Main layout: header, tabs, connected/disconnected states
│   ├── VaultStatusBar.tsx  # Lock status summary + progress ring
│   ├── AssetOverview.tsx   # Portfolio value + per-asset breakdown
│   ├── CountdownTimer.tsx  # Live unlock countdown
│   ├── LockForm.tsx        # Set / extend lock period
│   ├── DepositForm.tsx     # Multi-asset deposit + ERC-20 approval flow
│   ├── WithdrawForm.tsx    # Standard + emergency withdrawal
│   └── TransactionHistory.tsx # On-chain activity feed
├── lib/
│   ├── wagmi.ts            # Chain + connector configuration
│   ├── constants.ts        # Contract address, token registry, contract constants
│   ├── useVaultData.ts     # Batched on-chain reads for the connected user
│   ├── useLivePrices.ts    # Live USD pricing with caching + fallback
│   └── utils.ts            # Shared helpers
├── abis/
│   └── PiggyBank.json      # Contract ABI + bytecode
└── contracts/
    └── PiggyBank.sol       # Vault contract source
```

---

## Deployment

PiggyBank is deployed on [Vercel](https://vercel.com/).

1. Push the repository to GitHub.
2. Import the project in Vercel.
3. Add the [environment variables](#environment-variables) under **Project Settings → Environment Variables** for the Production environment.
4. Add your deployment domain to the allowed domains list in your WalletConnect Cloud project.
5. Deploy.

```bash
vercel --prod
```

---

## Security Considerations

- This contract has **not been professionally audited**. Use it on testnets only until that changes.
- The emergency exit fee and cooldown exist to discourage casual early withdrawal, not to serve as a substitute for proper time-lock discipline.
- All custom ERC-20 token addresses entered manually should be verified independently — the app does not validate that an arbitrary address is a legitimate, non-malicious token contract.
- Treasury, fee, and pause controls are owner-restricted; review `PiggyBank.sol` directly before trusting any deployment with real value.

---

## Roadmap

- [ ] Per-chain token registry (current ERC-20 addresses are Ethereum mainnet–style and won't resolve on Sepolia or Base)
- [ ] Mainnet audit and deployment
- [ ] Multi-chain UI for Base and Mainnet alongside Sepolia
- [ ] Graceful fallback messaging for unsupported/legacy browsers
- [ ] Expanded transaction history (deeper block range, server-indexed)

---

## Contributing

Contributions, issues, and feature requests are welcome.

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/your-feature`)
3. Commit your changes (`git commit -m 'Add your feature'`)
4. Push to the branch (`git push origin feature/your-feature`)
5. Open a pull request

---

## License

Distributed under the MIT License. See `LICENSE` for details.

---

<div align="center">

Built with 🐷 and a healthy distrust of impulse purchases.

</div>