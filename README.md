# INTUDEX 🚀

**The Premier DEX and Staking Platform for INTUIT Tokens on Intuition Blockchain**

## What is INTUDEX?

INTUDEX is a comprehensive DeFi platform combining a **Decentralized Exchange (DEX)** with an innovative **single-sided staking protocol** for INTUIT tokens on the Intuition blockchain.

## 🎯 Core Features

- **🔄 Universal DEX Trading**: Trade ANY ERC20 tokens using Factory Pattern
- **🏭 Factory Pattern**: Create trading pairs for any token combination
- **💎 Single-Sided Staking**: Stake INTUIT tokens without impermanent loss
- **🎁 Collective Rewards**: 12.5% APY when community reaches 10,000+ INTUIT threshold
- **⚡ Multi-Hop Swaps**: Automatic routing through multiple pairs
- **🏆 Fair Distribution**: Proportional rewards based on stake size

## 📊 Tokenomics

| Allocation | Percentage | Amount | Purpose |
|------------|------------|--------|---------|
| **DEX Liquidity** | 60% | 600,000 | Initial trading liquidity |
| **Staking Rewards** | 18% | 180,000 | Community staking incentives |
| **Governance** | 15% | 150,000 | Future governance & airdrops |
| **Development** | 7% | 70,000 | Development team allocation |

**Total Supply**: 1,000,000 INTUIT tokens

## 🏗️ Smart Contracts

### Intuit.sol - ERC20 Token
- Standard ERC20 with 1M total supply
- Gas-optimized transfers and approvals

### DEXFactory.sol - Universal DEX Factory
- Create trading pairs for ANY ERC20 tokens
- Factory Pattern implementation (Uniswap V2 style)
- Automated pair discovery and management

### DEXRouter.sol - Trading Router
- Simplified interface for token swaps
- Multi-hop routing for complex trades
- Optimal pricing across all pairs

### DEXPair.sol - Individual Trading Pairs
- Constant Product AMM (`x * y = k`)
- Independent liquidity per pair
- Fee collection and distribution

### IntuitStaker.sol - Staking Protocol
- Single-sided INTUIT staking
- Collective 10,000 INTUIT threshold
- Real-time reward calculations
- Flexible unstaking

## 🚀 Quick Start

```bash
# Clone repository
git clone https://github.com/coux-v/intudex.git
cd intudex

# Install dependencies
yarn install

# Start development
yarn chain    # Terminal 1 - Local blockchain
yarn deploy   # Terminal 2 - Deploy contracts  
yarn start    # Terminal 3 - Frontend
```

## 🌐 Live Deployment

- **Frontend**: [INTUDEX App](https://intudex-g54wlhjhp-baris-projects-49ea2d32.vercel.app)
- **Network**: Intuition Blockchain (Chain ID: 13579)

### Contract Addresses

**Legacy Contracts (Testnet):**
```
INTUIT Token:    0x3Aa5ebB10DC797CAC828524e59A333d0A371443c
IntuitDEX:       0xc6e7DF5E7b4f2A278906862b61205850344D4e7d
IntuitStaker:    0x59b670e9fA9D0A427751Af201D676719a970857b
```

**Factory Pattern (Local/Development):**
```
DEX Factory:     0x2279B7A0a67DB372996a5FaB50D91eAA73d2eBe6
DEX Router:      0x610178dA211FEF7D417bC0e6FeD39F05609AD788
WETH:           0x8A791620dd6260079BF849Dc5567aDC3F2FdC318
INTUIT Token:    0x5FbDB2315678afecb367f032d93F642f64180aa3
```

## 💡 How It Works

### Universal DEX Trading
1. **Trade Any Tokens**: Select from available ERC20 tokens
2. **Auto-Pair Creation**: Pairs are created automatically if they don't exist
3. **Multi-Hop Routing**: Seamless trading through multiple pairs
4. **One-Click Swaps**: Execute trades with optimal pricing

### Creating New Trading Pairs
1. Go to **PAIRS** tab in the interface
2. Select any two ERC20 tokens
3. Click **"Create Pair"** 
4. Start trading immediately!

### Staking Process  
1. Stake INTUIT tokens (single-sided)
2. Help reach 10,000 INTUIT collective threshold
3. Earn 12.5% APY when threshold is met
4. Claim proportional rewards anytime
5. Unstake immediately without penalties

## 🔗 Adding New Tokens & Pairs

INTUDEX now supports **ANY ERC20 token** through the Factory Pattern! Here's how to add new tokens:

### Step 1: Add Token to Configuration
In `packages/nextjs/utils/dexFactory.ts`:
```typescript
export const AVAILABLE_TOKENS: Token[] = [
  // Existing tokens...
  {
    symbol: "USDC",
    name: "USD Coin",
    address: "0xYourUSDCAddress...",
    logo: "/usdc.png"
  }
];
```

### Step 2: Create Trading Pair
1. Open INTUDEX interface
2. Go to **PAIRS** tab
3. Select your new token + any existing token
4. Click **"Create Pair"**

### Step 3: Start Trading
- Your new pair appears automatically in **SWAP** tab
- Add liquidity to enable trading
- Enjoy seamless swaps!

### Supported Token Examples
- **Stablecoins**: USDC, USDT, DAI
- **Wrapped Assets**: WETH, WBTC
- **DeFi Tokens**: UNI, AAVE, COMP
- **Custom Tokens**: Any ERC20 on your blockchain

## 📈 Benefits

**For Traders:**
- **Universal Trading**: Swap ANY ERC20 tokens
- **Factory Pattern**: Create pairs on-demand
- **Multi-Hop Routing**: Optimal pricing through multiple pairs
- **Deep Liquidity**: Independent pools per pair
- **Instant Swaps**: Fast, secure transactions

**For Stakers:**
- No impermanent loss risk
- High APY (12.5%)
- Community-driven rewards
- Flexible unstaking

## 🔧 Tech Stack

- **Frontend**: Next.js 15, Wagmi, RainbowKit, Tailwind CSS
- **Contracts**: Solidity, Hardhat, OpenZeppelin
- **Architecture**: Factory Pattern (Uniswap V2 style)
- **Blockchain**: Intuition (Chain ID: 13579)
- **Deployment**: Vercel (Frontend), Hardhat (Contracts)

## 🏗️ Architecture Overview

```
┌─────────────────┐    ┌─────────────────┐
│   DEXFactory    │───▶│    DEXPair      │
│   (Creates)     │    │  (TokenA/B)     │
└─────────────────┘    └─────────────────┘
         │                       │
         ▼                       ▼
┌─────────────────┐    ┌─────────────────┐
│   DEXRouter     │───▶│   Liquidity     │
│  (Simplifies)   │    │    Providers    │
└─────────────────┘    └─────────────────┘
```

### Key Components:
- **Factory**: Creates & manages all trading pairs
- **Router**: Simplified interface for swaps & liquidity
- **Pairs**: Individual AMM contracts per token pair  
- **WETH**: Wrapped native token for trading

## 🔒 Security Features

- Reentrancy protection
- Access controls
- Comprehensive testing
- Secure wallet integration

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/coux-v/intudex/issues)
- **Documentation**: [Wiki](https://github.com/coux-v/intudex/wiki)

## 📄 License

MIT License - see [LICENSE](LICENSE) file

---

**Built with ❤️ for the Intuition blockchain ecosystem**
