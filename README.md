# INTUDEX 🚀

**The Premier DEX and Staking Platform for INTUIT Tokens on Intuition Blockchain**

## What is INTUDEX?

INTUDEX is a comprehensive DeFi platform combining a **Decentralized Exchange (DEX)** with an innovative **single-sided staking protocol** for INTUIT tokens on the Intuition blockchain.

## 🎯 Core Features

- **🔄 DEX Trading**: Seamless TTRUST ↔ INTUIT swaps using Constant Product AMM
- **💎 Single-Sided Staking**: Stake INTUIT tokens without impermanent loss
- **🎁 Collective Rewards**: 12.5% APY when community reaches 10,000+ INTUIT threshold
- **⚡ Immediate Unstaking**: Withdraw tokens anytime without penalties
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

### IntuitDEX.sol - Decentralized Exchange
- Constant Product AMM (`x * y = k`)
- Native TTRUST integration
- Liquidity management with fee distribution

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
```
INTUIT Token:    0x3Aa5ebB10DC797CAC828524e59A333d0A371443c
IntuitDEX:       0xc6e7DF5E7b4f2A278906862b61205850344D4e7d
IntuitStaker:    0x59b670e9fA9D0A427751Af201D676719a970857b
```

## 💡 How It Works

### DEX Trading
1. Connect wallet to INTUDEX
2. Select TTRUST or INTUIT tokens
3. Enter trade amount
4. Execute swap with one click

### Staking Process  
1. Stake INTUIT tokens (single-sided)
2. Help reach 10,000 INTUIT collective threshold
3. Earn 12.5% APY when threshold is met
4. Claim proportional rewards anytime
5. Unstake immediately without penalties

## 📈 Benefits

**For Traders:**
- Deep liquidity (600K INTUIT)
- Fair AMM pricing
- Instant swaps

**For Stakers:**
- No impermanent loss risk
- High APY (12.5%)
- Community-driven rewards
- Flexible unstaking

## 🔧 Tech Stack

- **Frontend**: Next.js 15, Wagmi, RainbowKit, Tailwind CSS
- **Contracts**: Solidity, Hardhat, OpenZeppelin
- **Blockchain**: Intuition (Chain ID: 13579)
- **Deployment**: Vercel (Frontend), Hardhat (Contracts)

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
