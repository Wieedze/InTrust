const { ethers } = require("hardhat");

async function main() {
  console.log("\n🚀 DEPLOYING COMPLETE ECOSYSTEM WITH FAUCET & LIQUIDITY");
  console.log("======================================================");
  console.log("🎯 TRUST + INTUIT + DEX + Staking + Faucet + Liquidity Pool!");
  
  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);
  
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("TRUST Balance:", ethers.formatEther(balance), "TRUST");
  
  // Deploy INTUIT Token
  console.log("\n📝 1. Deploying INTUIT Token...");
  const IntuitToken = await ethers.getContractFactory("Intuit");
  const intuitToken = await IntuitToken.deploy();
  await intuitToken.waitForDeployment();
  console.log("✅ INTUIT Token:", await intuitToken.getAddress());
  
  // Deploy WETH (needed for DEX)
  console.log("\n💰 2. Deploying WETH...");
  const WETH = await ethers.getContractFactory("WETH");
  const weth = await WETH.deploy();
  await weth.waitForDeployment();
  console.log("✅ WETH:", await weth.getAddress());
  
  // Deploy DEX Factory
  console.log("\n🏭 3. Deploying DEX Factory...");
  const DEXFactory = await ethers.getContractFactory("DEXFactory");
  const factory = await DEXFactory.deploy(deployer.address);
  await factory.waitForDeployment();
  console.log("✅ DEX Factory:", await factory.getAddress());
  
  // Deploy DEX Router
  console.log("\n🔄 4. Deploying DEX Router...");
  const DEXRouter = await ethers.getContractFactory("DEXRouter");
  const router = await DEXRouter.deploy(await factory.getAddress(), await weth.getAddress());
  await router.waitForDeployment();
  console.log("✅ DEX Router:", await router.getAddress());
  
  // Deploy INTUIT Faucet
  console.log("\n🚰 5. Deploying INTUIT Faucet...");
  const IntuitFaucet = await ethers.getContractFactory("IntuitFaucet");
  const faucet = await IntuitFaucet.deploy(await intuitToken.getAddress());
  await faucet.waitForDeployment();
  console.log("✅ INTUIT Faucet:", await faucet.getAddress());
  
  // Deploy IntuitStaking
  console.log("\n🏦 6. Deploying IntuitStaking...");
  const IntuitStaking = await ethers.getContractFactory("IntuitStaking");
  const staking = await IntuitStaking.deploy(
    await intuitToken.getAddress(),
    ethers.parseEther("0.001"),
    ethers.parseEther("10")
  );
  await staking.waitForDeployment();
  console.log("✅ IntuitStaking:", await staking.getAddress());
  
  // Fund the faucet
  console.log("\n🚰 7. Funding Faucet...");
  const faucetAmount = ethers.parseEther("100000"); // 100k INTUIT for faucet
  const approveFaucetTx = await intuitToken.approve(await faucet.getAddress(), faucetAmount);
  await approveFaucetTx.wait();
  
  const fundFaucetTx = await faucet.fundFaucet(faucetAmount);
  await fundFaucetTx.wait();
  console.log(`✅ Faucet funded with ${ethers.formatEther(faucetAmount)} INTUIT`);
  
  // Fund staking rewards
  console.log("\n💰 8. Funding Staking Rewards...");
  const stakingAmount = ethers.parseEther("200000"); // 200k INTUIT for staking
  const approveStakingTx = await intuitToken.approve(await staking.getAddress(), stakingAmount);
  await approveStakingTx.wait();
  
  const fundStakingTx = await staking.fundRewardPool(stakingAmount);
  await fundStakingTx.wait();
  console.log(`✅ Staking funded with ${ethers.formatEther(stakingAmount)} INTUIT`);
  
  // Create liquidity pool
  console.log("\n🏊 9. Creating TRUST/INTUIT Liquidity Pool...");
  
  // Amounts for initial liquidity
  const trustAmount = ethers.parseEther("10"); // 10 TRUST
  const intuitAmountForLiquidity = ethers.parseEther("10000"); // 10k INTUIT
  
  // Approve INTUIT for router
  const approveRouterTx = await intuitToken.approve(await router.getAddress(), intuitAmountForLiquidity);
  await approveRouterTx.wait();
  
  // Add liquidity (TRUST is native, so we send it as value)
  const deadline = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
  
  const addLiquidityTx = await router.addLiquidityETH(
    await intuitToken.getAddress(), // INTUIT token
    intuitAmountForLiquidity,       // INTUIT amount
    intuitAmountForLiquidity,       // min INTUIT (same for initial)
    trustAmount,                    // min TRUST
    deployer.address,               // LP tokens to
    deadline,                       // deadline
    { value: trustAmount }          // TRUST amount (as ETH value)
  );
  await addLiquidityTx.wait();
  
  console.log(`✅ Liquidity pool created!`);
  console.log(`   - ${ethers.formatEther(trustAmount)} TRUST`);
  console.log(`   - ${ethers.formatEther(intuitAmountForLiquidity)} INTUIT`);
  
  // Get pair address
  const pairAddress = await factory.getPair(await intuitToken.getAddress(), await weth.getAddress());
  console.log("✅ TRUST/INTUIT Pair:", pairAddress);
  
  console.log("\n🎉 COMPLETE ECOSYSTEM DEPLOYED!");
  console.log("===============================");
  console.log("📋 Contract Addresses:");
  console.log("INTUIT Token     :", await intuitToken.getAddress());
  console.log("WETH             :", await weth.getAddress());
  console.log("DEX Factory      :", await factory.getAddress());
  console.log("DEX Router       :", await router.getAddress());
  console.log("INTUIT Faucet    :", await faucet.getAddress());
  console.log("IntuitStaking    :", await staking.getAddress());
  console.log("TRUST/INTUIT Pair:", pairAddress);
  
  // Final balances
  const finalTrustBalance = await ethers.provider.getBalance(deployer.address);
  const intuitBalance = await intuitToken.balanceOf(deployer.address);
  const faucetBalance = await intuitToken.balanceOf(await faucet.getAddress());
  const stakingBalance = await intuitToken.balanceOf(await staking.getAddress());
  
  console.log("\n💰 Token Distribution:");
  console.log(`Deployer TRUST  : ${ethers.formatEther(finalTrustBalance)}`);
  console.log(`Deployer INTUIT : ${ethers.formatEther(intuitBalance)}`);
  console.log(`Faucet INTUIT   : ${ethers.formatEther(faucetBalance)}`);
  console.log(`Staking INTUIT  : ${ethers.formatEther(stakingBalance)}`);
  
  console.log("\n🎯 What users can now do:");
  console.log("✅ Claim 1000 INTUIT from faucet (every 24h)");
  console.log("✅ Trade TRUST ↔ INTUIT on DEX (liquidity available!)");
  console.log("✅ Stake INTUIT to earn rewards");
  console.log("✅ Complete DeFi ecosystem ready!");
  
  console.log("\n📝 Interface Configuration:");
  console.log("const ADDRESSES = {");
  console.log(`  INTUIT: "${await intuitToken.getAddress()}",`);
  console.log(`  DEX_ROUTER: "${await router.getAddress()}",`);
  console.log(`  DEX_FACTORY: "${await factory.getAddress()}",`);
  console.log(`  INTUIT_FAUCET: "${await faucet.getAddress()}",`);
  console.log(`  INTUIT_STAKING: "${await staking.getAddress()}",`);
  console.log(`  TRUST_INTUIT_PAIR: "${pairAddress}"`);
  console.log("};");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });