# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

SwapTrust is a DeFi platform built on Scaffold-ETH 2 for the Intuition blockchain, featuring a DEX (Decentralized Exchange) and dual staking system for TRUST (native) and INTUIT (ERC20) tokens.

## Common Commands

### Development Setup
```bash
yarn install                   # Install all dependencies
yarn start                     # Start Next.js frontend development server
yarn chain                     # Start local Hardhat blockchain (for local dev)
yarn deploy                    # Deploy contracts locally or to configured network
```

### Smart Contract Development
```bash
yarn hardhat:compile          # Compile Solidity contracts
yarn hardhat:test             # Run contract tests with gas reporting
yarn hardhat:deploy           # Deploy contracts to target network
yarn hardhat:verify           # Verify contracts on block explorer
yarn hardhat:chain            # Start local blockchain node
yarn hardhat:fork             # Fork mainnet for local development
```

### Frontend Development
```bash
yarn next:build               # Build Next.js production bundle
yarn next:check-types         # TypeScript type checking for frontend
yarn next:lint                # Lint Next.js code
yarn format                   # Format code (both contracts and frontend)
```

### Testing and Quality
```bash
yarn test                     # Run smart contract tests
yarn lint                     # Lint both Hardhat and Next.js packages
yarn hardhat:check-types      # TypeScript checking for contracts
```

### Deployment
```bash
yarn vercel                   # Deploy to Vercel with custom build flags
yarn vercel:yolo              # Deploy to Vercel ignoring build errors
```

## Architecture Overview

### Monorepo Structure
- **Yarn Workspaces**: Manages dependencies between packages
- **packages/hardhat/**: Smart contract development with Hardhat framework
- **packages/nextjs/**: Next.js frontend with App Router

### Smart Contract Architecture

#### Core DEX Contracts
- **DEXFactory.sol**: Uniswap V2-style factory for creating TRUST/INTUIT pairs
- **DEXRouter.sol**: Handles swaps with native TRUST token support (no wrapping)
- **DEXPair.sol**: AMM contract implementing TRUST/INTUIT trading pair
- **Intuit.sol**: ERC20 token contract (1M total supply)

#### Staking Contracts
- **TrustStakingFixed.sol**: Native TRUST staking (payable, no approval needed)
- **IntuitStaking.sol**: ERC20 INTUIT staking (requires approval)
- Both contracts mint INTUIT as rewards

### Frontend Architecture

#### Key Components
- **UniversalDex**: Main trading interface combining swap, stake, and bridge functionality
- **StakeInterface**: Dual staking UI for both TRUST and INTUIT tokens
- **TokenBridge**: Bridge interface component
- **ParticleBackground**: Animated background effects

#### Tech Stack Integration
- **Wagmi + RainbowKit**: Web3 wallet connection and contract interaction
- **Scaffold-ETH Hooks**: Custom hooks for contract reads/writes
- **Next.js App Router**: Modern React framework with file-based routing
- **Tailwind CSS + Shadcn/ui**: Styling and component library

## Network Configuration

### Target Network: Intuition Testnet
- **Chain ID**: 13579
- **RPC URL**: https://testnet.rpc.intuition.systems/http
- **Native Token**: TRUST
- **Block Explorer**: Available through Intuition ecosystem

### Contract Addresses (Testnet)
```
INTUIT Token:           0xe8bD8876CB6f97663c668faae65C4Da579FfA0B5
DEX Factory:            0x54D248E118983dDdDF4DAA605CBa832BA6F1eb4C  
DEX Router:             0x42Af1bCF6BD4876421b27c2a7Fcd9C8315cDA121
INTUIT Staking:         0xCc70E3Acd7764e8c376b11A05c47eAFf05a1e115
TRUST Staking (Fixed):  0x546a4E6BF6195A809632B528de28691BBFDb7507
```

## Development Patterns

### Contract Interaction (Frontend)
Always use Scaffold-ETH hooks for contract interactions:

```typescript
// Reading contract data
const { data } = useScaffoldReadContract({
  contractName: "DEXRouter",
  functionName: "getAmountsOut",
  args: [amountIn, [tokenA, tokenB]],
});

// Writing to contracts
const { writeContractAsync } = useScaffoldWriteContract("DEXRouter");
await writeContractAsync({
  functionName: "swapExactTokensForTokens",
  args: [amountIn, amountOutMin, path, to, deadline],
  value: parseEther("0.1"), // for payable functions
});
```

### Token System Architecture
- **TRUST**: Native blockchain token (like ETH) - used for gas, trading, and staking
- **INTUIT**: ERC20 token - used for trading, staking, and as reward token
- **Native Token Advantage**: TRUST staking requires no approvals (payable functions)

### Key Development Considerations
- **Native Token Handling**: TRUST transactions use `value` field, not token transfers
- **Dual Token Support**: Components must handle both native and ERC20 patterns
- **Slippage Protection**: Built into DEX router with automatic calculations
- **Reward Logic**: Both staking contracts mint INTUIT as rewards

### Testing Strategy
- **Gas Optimization**: Tests include gas reporting (`REPORT_GAS=true`)
- **Security Tests**: Dedicated security test suite in `test/Security.test.ts`
- **Integration Tests**: DEX functionality tested with actual liquidity scenarios

### Configuration Files
- **scaffold.config.ts**: Network targeting (currently Intuition Testnet)
- **hardhat.config.ts**: Solidity compiler, networks, and deployment settings
- **wagmiConfig.tsx**: Web3 connection configuration

## Package Management
- **Required**: Yarn (specified in package.json: `yarn@3.2.3`)
- **Node Version**: >=20.18.3
- **Workspace Structure**: Root package manages both hardhat and nextjs packages

## Important Notes
- **Network Focus**: Built specifically for Intuition blockchain
- **Scaffold-ETH Base**: Extends SE-2 patterns and components
- **Contract Deployment**: Uses hardhat-deploy for deterministic deployments
- **Frontend Deployment**: Optimized for Vercel with custom build flags