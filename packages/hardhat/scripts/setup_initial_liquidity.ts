import { ethers } from "hardhat";
import { parseEther, formatEther } from "viem";

/**
 * Setup REALISTIC initial liquidity for TTRUST/INTUIT DEX
 * Based on current TTRUST balance: 5.21 TTRUST
 * 
 * Strategy: Start small, prove concept, scale later
 */

async function main() {
  const [deployer] = await ethers.getSigners();
  
  // Contract addresses
  const INTUIT_ADDRESS = "0x0FdCaA7eD86b888bc4617f39463dDAa55bfE17C1";
  const TTRUST_ADDRESS = "0xA54b4E6e356b963Ee00d1C947f478d9194a1a210";
  const TOKEN_DEX_ADDRESS = "0x04BfB74f07c5E4C318ef3c90c4713F068548f809";
  
  // Conservative liquidity amounts (use 80% of available TTRUST for safety)
  const TTRUST_LIQUIDITY = parseEther("4");        // 4 TTRUST (keep 1.21 for gas)
  const INTUIT_LIQUIDITY = parseEther("4000");     // 4,000 INTUIT (1:1000 ratio)
  
  console.log("🚀 Setting up REALISTIC DEX liquidity...");
  console.log(`Deployer: ${deployer.address}`);
  console.log(`TTRUST Liquidity: ${formatEther(TTRUST_LIQUIDITY)} TTRUST`);
  console.log(`INTUIT Liquidity: ${formatEther(INTUIT_LIQUIDITY)} INTUIT`);
  console.log(`Exchange Rate: 1 TTRUST = 1000 INTUIT`);
  console.log(`INTUIT Allocation: 0.004% of total supply (4K out of 100M)`);
  
  // Get contract instances
  const intuit = await ethers.getContractAt("Intuit", INTUIT_ADDRESS);
  const tokenDex = await ethers.getContractAt("TokenDEX", TOKEN_DEX_ADDRESS);
  
  // Check balances
  const intuitBalance = await intuit.balanceOf(deployer.address);
  const ttrustBalance = await ethers.provider.getBalance(deployer.address);
  
  console.log(`\n📊 Current Balances:`);
  console.log(`INTUIT: ${formatEther(intuitBalance)}`);
  console.log(`TTRUST: ${formatEther(ttrustBalance)}`);
  
  // Validate balances
  if (intuitBalance < INTUIT_LIQUIDITY) {
    throw new Error(`Insufficient INTUIT. Need: ${formatEther(INTUIT_LIQUIDITY)}, Have: ${formatEther(intuitBalance)}`);
  }
  
  if (ttrustBalance < TTRUST_LIQUIDITY + parseEther("1")) { // Keep 1 TTRUST for gas
    throw new Error(`Insufficient TTRUST. Need: ${formatEther(TTRUST_LIQUIDITY)} + gas, Have: ${formatEther(ttrustBalance)}`);
  }
  
  console.log(`\n✅ Sufficient balances confirmed`);
  
  // Step 1: Approve INTUIT for TokenDEX
  console.log(`\n1️⃣ Approving INTUIT for TokenDEX...`);
  const approveTx = await intuit.approve(TOKEN_DEX_ADDRESS, INTUIT_LIQUIDITY);
  await approveTx.wait();
  console.log(`✅ INTUIT approved: ${approveTx.hash}`);
  
  // Step 2: Initialize DEX with liquidity
  console.log(`\n2️⃣ Initializing DEX with liquidity...`);
  const initTx = await tokenDex.init(TTRUST_LIQUIDITY, INTUIT_LIQUIDITY, {
    value: TTRUST_LIQUIDITY // Send TTRUST with the transaction
  });
  await initTx.wait();
  console.log(`✅ DEX initialized: ${initTx.hash}`);
  
  // Step 3: Verify liquidity
  console.log(`\n3️⃣ Verifying liquidity...`);
  const dexTtrustBalance = await ethers.provider.getBalance(TOKEN_DEX_ADDRESS);
  const dexIntuitBalance = await intuit.balanceOf(TOKEN_DEX_ADDRESS);
  
  console.log(`\n🎉 Initial Liquidity Setup Complete!`);
  console.log(`DEX TTRUST Balance: ${formatEther(dexTtrustBalance)}`);
  console.log(`DEX INTUIT Balance: ${formatEther(dexIntuitBalance)}`);
  
  // Calculate actual exchange rate
  const actualRate = Number(formatEther(dexIntuitBalance)) / Number(formatEther(dexTtrustBalance));
  console.log(`Actual Exchange Rate: 1 TTRUST = ${actualRate} INTUIT`);
  
  // Example swaps
  console.log(`\n📈 Example Swaps (with 0.3% fee):`);
  console.log(`- Swap 0.1 TTRUST → ~${(100 * 0.997).toFixed(1)} INTUIT`);
  console.log(`- Swap 0.5 TTRUST → ~${(500 * 0.997).toFixed(1)} INTUIT`);
  console.log(`- Swap 1.0 TTRUST → ~${(1000 * 0.997 * 0.995).toFixed(1)} INTUIT (with slippage)`);
  
  console.log(`\n🔮 Future Scaling Options:`);
  console.log(`1. Add more liquidity as you get more TTRUST`);
  console.log(`2. Adjust exchange rate by adding unbalanced liquidity`);
  console.log(`3. Target 33% allocation = 33M INTUIT needs 33K TTRUST`);
  console.log(`4. Get TTRUST from faucet or community to scale up`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
