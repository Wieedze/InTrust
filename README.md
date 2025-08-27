# DEX Platform 🚀

**Decentralized Exchange and Staking Platform for Intuition Blockchain**

## What is this DEX?

This is a streamlined DeFi platform combining a **Decentralized Exchange (DEX)** with **native TRUST and INTUIT token staking** on the Intuition blockchain. Built for simplicity and efficiency.

## 🎯 Core Features

- **🔄 TRUST ↔ INTUIT Trading**: Direct swapping between native TRUST and INTUIT tokens
- **📈 Real-time Conversion**: Live price quotes and conversion rates
- **💰 TRUST Staking**: Stake native TRUST tokens to earn INTUIT rewards  
- **🏦 INTUIT Staking**: Stake INTUIT tokens to earn INTUIT rewards
- **⚡ No Approval for TRUST**: Native token staking without ERC20 approvals
- **🎁 Instant Rewards**: Claim accumulated rewards anytime

## 📊 Token Information

### TRUST Token (Native)
- **Type**: Native blockchain token (like ETH)  
- **Use**: Transaction fees, trading, staking
- **Rewards**: Can be staked to earn INTUIT

### INTUIT Token (ERC20)
- **Total Supply**: 1,000,000 INTUIT
- **Use**: Trading, staking, rewards
- **Rewards**: Earned from staking both TRUST and INTUIT

## 🏗️ Smart Contracts

### Intuit.sol - ERC20 Token
- Standard ERC20 with 1M total supply
- Used for trading and rewards

### DEXFactory.sol - DEX Factory  
- Creates TRUST/INTUIT trading pairs
- Uniswap V2 style implementation

### DEXRouter.sol - Trading Router
- Handles TRUST ↔ INTUIT swaps
- Native ETH support for TRUST trades
- Automatic slippage protection

### TrustStakingFixed.sol - TRUST Staking
- Stake native TRUST tokens (payable)
- Earn INTUIT rewards
- No approval needed for native tokens

### IntuitStaking.sol - INTUIT Staking  
- Stake ERC20 INTUIT tokens
- Earn INTUIT rewards
- Requires token approval

## 🚀 Quick Start

```bash
# Clone repository
git clone https://github.com/your-username/dex-platform.git
cd dex-platform

# Install dependencies
npm install

# Start development
npm run dev
```

## 🌐 Testnet Deployment

- **Network**: Intuition Testnet (Chain ID: 13579)
- **RPC URL**: https://testnet.rpc.intuition.systems/http

### Contract Addresses (Intuition Testnet)

```
INTUIT Token:           0xe8bD8876CB6f97663c668faae65C4Da579FfA0B5
DEX Factory:            0x54D248E118983dDdDF4DAA605CBa832BA6F1eb4C  
DEX Router:             0x42Af1bCF6BD4876421b27c2a7Fcd9C8315cDA121
INTUIT Staking:         0xCc70E3Acd7764e8c376b11A05c47eAFf05a1e115
TRUST Staking (Fixed):  0x546a4E6BF6195A809632B528de28691BBFDb7507
```

## 💡 How It Works

### TRUST ↔ INTUIT Trading
1. **Connect Wallet**: Connect MetaMask to Intuition Testnet
2. **Select Tokens**: Choose TRUST or INTUIT 
3. **Enter Amount**: See real-time conversion in placeholder
4. **Swap**: Execute trade with automatic slippage protection

### TRUST Staking (Native)
1. **Go to STAKE tab** and select TRUST
2. **Enter Amount**: Minimum 1 TRUST
3. **Stake**: No approval needed (native token)
4. **Earn Rewards**: Accumulate INTUIT rewards over time
5. **Unstake/Claim**: Withdraw stake or claim rewards anytime

### INTUIT Staking (ERC20)
1. **Go to STAKE tab** and select INTUIT  
2. **Enter Amount**: Minimum 10 INTUIT
3. **Approve**: Approve token spending first
4. **Stake**: Stake approved INTUIT tokens
5. **Earn Rewards**: Accumulate INTUIT rewards over time

## ⚙️ Configuration

### Adding Custom Tokens
To add new tokens to the interface, edit the tokens array in:
`packages/nextjs/components/UniversalDex.tsx`

```typescript
const tokens = [
  { symbol: "TRUST", name: "TRUST Token", logo: "/trust.png", address: "native", decimals: 18, isNative: true },
  { symbol: "INTUIT", name: "Intuit Token", logo: "/intuit.png", address: "0xe8bD8876CB6f97663c668faae65C4Da579FfA0B5", decimals: 18, isNative: false },
  // Add your token here
];
```

### MetaMask Network Configuration
Add Intuition Testnet to MetaMask:
```
Network Name: Intuition Testnet
RPC URL: https://testnet.rpc.intuition.systems/http
Chain ID: 13579
Currency Symbol: TRUST
```

## 📈 Benefits

**For Traders:**
- **Direct TRUST ↔ INTUIT swaps**: No complex routing needed
- **Real-time quotes**: See conversion rates instantly
- **Native token support**: No wrapping needed for TRUST
- **Low fees**: 0.3% trading fee
- **Fast execution**: Instant swaps on Intuition network

**For Stakers:**
- **Dual staking options**: Stake both TRUST and INTUIT
- **Flexible rewards**: Claim INTUIT rewards anytime  
- **No lock periods**: Unstake immediately
- **Native staking**: Stake TRUST without approvals

## 🔧 Tech Stack

- **Frontend**: Next.js 14, TypeScript, Wagmi, RainbowKit, Tailwind CSS
- **Contracts**: Solidity ^0.8.19, Hardhat, OpenZeppelin
- **Blockchain**: Intuition Testnet (Chain ID: 13579)
- **Deployment**: Vercel (Frontend), Hardhat (Contracts)

## 🏗️ Architecture Overview

```
┌─────────────────┐    ┌─────────────────┐
│   DEXRouter     │───▶│    DEXPair      │
│ (TRUST/INTUIT)  │    │ (TRUST/INTUIT)  │
└─────────────────┘    └─────────────────┘
         │                       │
         ▼                       ▼
┌─────────────────┐    ┌─────────────────┐
│ TrustStaking    │    │ IntuitStaking   │
│ (Native stake)  │    │ (ERC20 stake)   │
└─────────────────┘    └─────────────────┘
```

### Key Components:
- **DEXRouter**: Handles TRUST ↔ INTUIT swaps with native ETH support
- **DEXPair**: AMM contract for TRUST/INTUIT trading pair
- **TrustStaking**: Native TRUST staking for INTUIT rewards  
- **IntuitStaking**: ERC20 INTUIT staking for INTUIT rewards

## 🔒 Security Features

- **Reentrancy protection**: All external calls protected
- **Access controls**: Owner functions properly restricted
- **Input validation**: Amount and address validation
- **Safe transfers**: Protected ERC20 and native transfers
- **Fixed reward logic**: No phantom rewards after unstaking

## 🚀 Deployment to Vercel

1. **Build test**: `npm run build` (must pass)
2. **Push to GitHub**: Commit all changes
3. **Connect to Vercel**: Import your repository
4. **Deploy**: Automatic deployment from main branch

The app will work immediately - all contracts are already deployed on Intuition Testnet!

## 📄 License

MIT License - see [LICENSE](LICENSE) file

---

**Clean DEX Platform for Intuition Blockchain**
