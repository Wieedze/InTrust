import { ethers } from "hardhat";
import { parseEther, formatEther } from "viem";

/**
 * Setup initial liquidity for TTRUST/INTUIT DEX
 * 
 * Tokenomics:
 * - INTUIT Total Supply: 100,000,000 tokens
 * - DEX Allocation: 33% = 33,000,000 INTUIT tokens
 * - Exchange Rate: 1 TTRUST = 1000 INTUIT (initial rate)
 * - Required TTRUST: 33,000 TTRUST for full liquidity
 */

async function main() {
  const [deployer] = await ethers.getSigners();
  
  // Contract addresses (update these with your deployed addresses)
  const INTUIT_ADDRESS = "0x0FdCaA7eD86b888bc4617f39463dDAa55bfE17C1";
  const TTRUST_ADDRESS = "0xA54b4E6e356b963Ee00d1C947f478d9194a1a210"; // Native TTRUST
  const TOKEN_DEX_ADDRESS = "0x04BfB74f07c5E4C318ef3c90c4713F068548f809";
  
  // Liquidity amounts
  const INTUIT_LIQUIDITY = parseEther("33000000"); // 33M INTUIT (33% of supply)
  const TTRUST_LIQUIDITY = parseEther("33000");    // 33K TTRUST (1:1000 ratio)
  
  console.log("🚀 Setting up DEX liquidity...");
  console.log(`Deployer: ${deployer.address}`);
  console.log(`INTUIT Liquidity: ${formatEther(INTUIT_LIQUIDITY)} INTUIT`);
  console.log(`TTRUST Liquidity: ${formatEther(TTRUST_LIQUIDITY)} TTRUST`);
  console.log(`Exchange Rate: 1 TTRUST = 1000 INTUIT`);
  
  // Get contract instances
  const intuit = await ethers.getContractAt("Intuit", INTUIT_ADDRESS);
  const tokenDex = await ethers.getContractAt("TokenDEX", TOKEN_DEX_ADDRESS);
  
  // Check deployer balances
  const intuitBalance = await intuit.balanceOf(deployer.address);
  const ttrustBalance = await ethers.provider.getBalance(deployer.address);
  
  console.log(`\n📊 Current Balances:`);
  console.log(`INTUIT: ${formatEther(intuitBalance)}`);
  console.log(`TTRUST: ${formatEther(ttrustBalance)}`);
  
  // Validate sufficient balances
  if (intuitBalance < INTUIT_LIQUIDITY) {
    throw new Error(`Insufficient INTUIT balance. Need: ${formatEther(INTUIT_LIQUIDITY)}, Have: ${formatEther(intuitBalance)}`);
  }
  
  if (ttrustBalance < TTRUST_LIQUIDITY) {
    throw new Error(`Insufficient TTRUST balance. Need: ${formatEther(TTRUST_LIQUIDITY)}, Have: ${formatEther(ttrustBalance)}`);
  }
  
  console.log(`\n✅ Sufficient balances confirmed`);
  
  // Step 1: Approve INTUIT for TokenDEX
  console.log(`\n1️⃣ Approving INTUIT for TokenDEX...`);
  const approveTx = await intuit.approve(TOKEN_DEX_ADDRESS, INTUIT_LIQUIDITY);
  await approveTx.wait();
  console.log(`✅ INTUIT approved: ${approveTx.hash}`);
  
  // Step 2: Approve TTRUST for TokenDEX (if it's ERC20)
  // Note: If TTRUST is native token, this step might be different
  console.log(`\n2️⃣ Approving TTRUST for TokenDEX...`);
  try {
    const ttrust = await ethers.getContractAt("IERC20", TTRUST_ADDRESS);
    const approveTtrustTx = await ttrust.approve(TOKEN_DEX_ADDRESS, TTRUST_LIQUIDITY);
    await approveTtrustTx.wait();
    console.log(`✅ TTRUST approved: ${approveTtrustTx.hash}`);
  } catch (error) {
    console.log(`⚠️  TTRUST approval failed (might be native token): ${error}`);
    console.log(`📝 Manual approval may be required`);
  }
  
  // Step 3: Initialize DEX with liquidity
  console.log(`\n3️⃣ Initializing DEX with liquidity...`);
  const initTx = await tokenDex.init(TTRUST_LIQUIDITY, INTUIT_LIQUIDITY);
  await initTx.wait();
  console.log(`✅ DEX initialized: ${initTx.hash}`);
  
  // Step 4: Verify liquidity was added
  console.log(`\n4️⃣ Verifying liquidity...`);
  const dexTtrustBalance = await ethers.provider.getBalance(TOKEN_DEX_ADDRESS);
  const dexIntuitBalance = await intuit.balanceOf(TOKEN_DEX_ADDRESS);
  
  console.log(`\n🎉 Liquidity Setup Complete!`);
  console.log(`DEX TTRUST Balance: ${formatEther(dexTtrustBalance)}`);
  console.log(`DEX INTUIT Balance: ${formatEther(dexIntuitBalance)}`);
  const exchangeRate = Number(formatEther(dexIntuitBalance)) / Number(formatEther(dexTtrustBalance));
  console.log(`Initial Exchange Rate: 1 TTRUST = ${exchangeRate.toFixed(2)} INTUIT`);
  
  // Calculate price impact examples
  console.log(`\n📈 Price Examples:`);
  console.log(`- Swap 1 TTRUST → ~${(1000 * 0.997).toFixed(2)} INTUIT (0.3% fee)`);
  console.log(`- Swap 10 TTRUST → ~${(10000 * 0.997 * 0.99).toFixed(2)} INTUIT (with slippage)`);
  console.log(`- Swap 100 TTRUST → ~${(100000 * 0.997 * 0.97).toFixed(2)} INTUIT (higher slippage)`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
