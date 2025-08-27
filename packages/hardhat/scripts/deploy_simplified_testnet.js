const { ethers } = require("hardhat");

async function main() {
  console.log("\n🚀 DEPLOYING ULTRA-CLEAN ECOSYSTEM ON TESTNET");
  console.log("============================================");
  console.log("🎯 Focus: TRUST (native) + INTUIT only - No wrapped tokens!");
  
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
  
  // Skip WTRUST - using native TRUST only
  
  // Deploy IntuitStaking
  console.log("\n🏦 5. Deploying IntuitStaking...");
  const IntuitStaking = await ethers.getContractFactory("IntuitStaking");
  const staking = await IntuitStaking.deploy(
    await intuitToken.getAddress(), // INTUIT token address
    ethers.parseEther("0.001"),     // 0.1% reward rate per second
    ethers.parseEther("10")         // min stake 10 INTUIT
  );
  await staking.waitForDeployment();
  console.log("✅ IntuitStaking:", await staking.getAddress());
  
  // Fund the staking contract with rewards
  console.log("\n💰 6. Funding Staking Rewards...");
  const rewardAmount = ethers.parseEther("100000"); // 100k INTUIT for rewards
  const approveTx = await intuitToken.approve(await staking.getAddress(), rewardAmount);
  await approveTx.wait();
  
  const fundTx = await staking.fundRewardPool(rewardAmount);
  await fundTx.wait();
  console.log(`✅ Staking pool funded with ${ethers.formatEther(rewardAmount)} INTUIT rewards`);
  
  console.log("\n🎉 ULTRA-CLEAN ECOSYSTEM DEPLOYED!");
  console.log("=================================");
  console.log("📋 Your Contract Addresses:");
  console.log("INTUIT Token     :", await intuitToken.getAddress());
  console.log("WETH             :", await weth.getAddress());
  console.log("DEX Factory      :", await factory.getAddress());
  console.log("DEX Router       :", await router.getAddress());
  console.log("IntuitStaking    :", await staking.getAddress());
  
  console.log("\n✅ Your Clean Ecosystem:");
  console.log("1. ✅ TRUST (native token - no wrapping needed)");
  console.log("2. ✅ INTUIT (your main ERC20 token - 1M supply)"); 
  console.log("3. ✅ INTUIT staking (earn INTUIT rewards by staking INTUIT)");
  console.log("4. ✅ DEX ready (TRUST ↔ INTUIT trading when you add liquidity)");
  console.log("5. ✅ Zero fake tokens - pure ecosystem!");
  console.log("6. ✅ 100k INTUIT reward pool ready for stakers!");
  
  // Show your balances
  const finalTrustBalance = await ethers.provider.getBalance(deployer.address);
  const intuitBalance = await intuitToken.balanceOf(deployer.address);
  const stakingRewards = await intuitToken.balanceOf(await staking.getAddress());
  
  console.log("\n💰 Token Distribution:");
  console.log(`Your TRUST  : ${ethers.formatEther(finalTrustBalance)} (native testnet token)`);
  console.log(`Your INTUIT : ${ethers.formatEther(intuitBalance)} (available for you)`);
  console.log(`Staking Rewards: ${ethers.formatEther(stakingRewards)} INTUIT (for stakers)`);
  
  console.log("\n📝 Interface Configuration:");
  console.log("const TESTNET_ADDRESSES = {");
  console.log(`  INTUIT: "${await intuitToken.getAddress()}",`);
  console.log(`  WETH: "${await weth.getAddress()}",`);
  console.log(`  DEX_ROUTER: "${await router.getAddress()}",`);
  console.log(`  DEX_FACTORY: "${await factory.getAddress()}",`);
  console.log(`  INTUIT_STAKING: "${await staking.getAddress()}"`);
  console.log("};");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });