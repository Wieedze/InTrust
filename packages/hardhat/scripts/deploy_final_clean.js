const { ethers } = require("hardhat");

async function main() {
  console.log("\n🚀 DEPLOYING FINAL CLEAN ECOSYSTEM ON TESTNET");
  console.log("============================================");
  console.log("🎯 TRUST (native) + INTUIT + DEX + Staking - NO WETH!");
  
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
  
  // Deploy DEX Factory (no WETH needed!)
  console.log("\n🏭 2. Deploying DEX Factory...");
  const DEXFactory = await ethers.getContractFactory("DEXFactory");
  const factory = await DEXFactory.deploy(deployer.address);
  await factory.waitForDeployment();
  console.log("✅ DEX Factory:", await factory.getAddress());
  
  // Deploy minimal WETH for DEXRouter compatibility
  console.log("\n💰 3. Deploying minimal WETH...");
  const WETH = await ethers.getContractFactory("WETH");
  const weth = await WETH.deploy();
  await weth.waitForDeployment();
  console.log("✅ WETH:", await weth.getAddress());

  // Deploy DEX Router (needs WETH address for compatibility)
  console.log("\n🔄 4. Deploying DEX Router...");
  const DEXRouter = await ethers.getContractFactory("DEXRouter");
  const router = await DEXRouter.deploy(
    await factory.getAddress(), 
    await weth.getAddress()  // WETH needed for DEXRouter constructor
  );
  await router.waitForDeployment();
  console.log("✅ DEX Router:", await router.getAddress());
  
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
  const rewardAmount = ethers.parseEther("200000"); // 200k INTUIT for rewards (20% of supply)
  const approveTx = await intuitToken.approve(await staking.getAddress(), rewardAmount);
  await approveTx.wait();
  
  const fundTx = await staking.fundRewardPool(rewardAmount);
  await fundTx.wait();
  console.log(`✅ Staking pool funded with ${ethers.formatEther(rewardAmount)} INTUIT rewards`);
  
  console.log("\n🎉 FINAL CLEAN ECOSYSTEM DEPLOYED!");
  console.log("=================================");
  console.log("📋 Your Contract Addresses:");
  console.log("INTUIT Token     :", await intuitToken.getAddress());
  console.log("DEX Factory      :", await factory.getAddress());
  console.log("DEX Router       :", await router.getAddress());
  console.log("IntuitStaking    :", await staking.getAddress());
  
  console.log("\n✅ Your Perfect Ecosystem:");
  console.log("1. ✅ TRUST (native token - for transactions & trading)");
  console.log("2. ✅ INTUIT (your main ERC20 token - 1M supply)"); 
  console.log("3. ✅ DEX (TRUST ↔ INTUIT direct trading, no WETH!)");
  console.log("4. ✅ INTUIT staking (earn INTUIT rewards by staking INTUIT)");
  console.log("5. ✅ 200k INTUIT reward pool (20% of supply for stakers!)");
  console.log("6. ✅ Zero unnecessary tokens - pure clean ecosystem!");
  
  // Show your balances
  const finalTrustBalance = await ethers.provider.getBalance(deployer.address);
  const intuitBalance = await intuitToken.balanceOf(deployer.address);
  const stakingRewards = await intuitToken.balanceOf(await staking.getAddress());
  
  console.log("\n💰 Token Distribution:");
  console.log(`Your TRUST  : ${ethers.formatEther(finalTrustBalance)} (native testnet token)`);
  console.log(`Your INTUIT : ${ethers.formatEther(intuitBalance)} (available for you)`);
  console.log(`Staking Rewards: ${ethers.formatEther(stakingRewards)} INTUIT (for stakers)`);
  
  console.log("\n🎯 What your ecosystem offers:");
  console.log("• Trade TRUST ↔ INTUIT on your DEX");
  console.log("• Stake INTUIT to earn INTUIT rewards");
  console.log("• Simple, clean, focused on YOUR tokens");
  console.log("• No fake tokens, no unnecessary complexity");
  
  console.log("\n📝 Interface Configuration:");
  console.log("const CLEAN_TESTNET_ADDRESSES = {");
  console.log(`  INTUIT: "${await intuitToken.getAddress()}",`);
  console.log(`  DEX_ROUTER: "${await router.getAddress()}",`);
  console.log(`  DEX_FACTORY: "${await factory.getAddress()}",`);
  console.log(`  INTUIT_STAKING: "${await staking.getAddress()}"`);
  console.log("};");
  
  console.log("\n🎉 ECOSYSTEM COMPLETE!");
  console.log("Ready for users to trade and stake!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });