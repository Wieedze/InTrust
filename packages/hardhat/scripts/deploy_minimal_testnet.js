const { ethers } = require("hardhat");

async function main() {
  console.log("\n🚀 DEPLOYING MINIMAL ECOSYSTEM ON TESTNET");
  console.log("=======================================");
  console.log("🎯 Focus: TRUST (native) + INTUIT + Staking ONLY!");
  
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
  
  // Deploy IntuitStaking
  console.log("\n🏦 2. Deploying IntuitStaking...");
  const IntuitStaking = await ethers.getContractFactory("IntuitStaking");
  const staking = await IntuitStaking.deploy(
    await intuitToken.getAddress(), // INTUIT token address
    ethers.parseEther("0.001"),     // 0.1% reward rate per second
    ethers.parseEther("10")         // min stake 10 INTUIT
  );
  await staking.waitForDeployment();
  console.log("✅ IntuitStaking:", await staking.getAddress());
  
  // Fund the staking contract with rewards
  console.log("\n💰 3. Funding Staking Rewards...");
  const rewardAmount = ethers.parseEther("200000"); // 200k INTUIT for rewards (20% of supply)
  const approveTx = await intuitToken.approve(await staking.getAddress(), rewardAmount);
  await approveTx.wait();
  
  const fundTx = await staking.fundRewardPool(rewardAmount);
  await fundTx.wait();
  console.log(`✅ Staking pool funded with ${ethers.formatEther(rewardAmount)} INTUIT rewards`);
  
  console.log("\n🎉 MINIMAL ECOSYSTEM DEPLOYED!");
  console.log("=============================");
  console.log("📋 Your Contract Addresses:");
  console.log("INTUIT Token     :", await intuitToken.getAddress());
  console.log("IntuitStaking    :", await staking.getAddress());
  
  console.log("\n✅ Your Ultra-Minimal Ecosystem:");
  console.log("1. ✅ TRUST (native token for transactions)");
  console.log("2. ✅ INTUIT (your main ERC20 token - 1M supply)"); 
  console.log("3. ✅ INTUIT staking (earn INTUIT rewards by staking INTUIT)");
  console.log("4. ✅ 200k INTUIT reward pool (20% of supply for stakers!)");
  console.log("5. ✅ Clean & simple - no DEX, no wrapped tokens!");
  
  // Show your balances
  const finalTrustBalance = await ethers.provider.getBalance(deployer.address);
  const intuitBalance = await intuitToken.balanceOf(deployer.address);
  const stakingRewards = await intuitToken.balanceOf(await staking.getAddress());
  
  console.log("\n💰 Token Distribution:");
  console.log(`Your TRUST  : ${ethers.formatEther(finalTrustBalance)} (native testnet token)`);
  console.log(`Your INTUIT : ${ethers.formatEther(intuitBalance)} (available for you)`);
  console.log(`Staking Rewards: ${ethers.formatEther(stakingRewards)} INTUIT (for stakers)`);
  
  console.log("\n🎯 What you can do:");
  console.log("• Stake your INTUIT tokens to earn rewards");
  console.log("• Users connect wallet and stake INTUIT");
  console.log("• Earn passive income from staking");
  console.log("• Simple, clean, focused ecosystem!");
  
  console.log("\n📝 Interface Configuration:");
  console.log("const TESTNET_ADDRESSES = {");
  console.log(`  INTUIT: "${await intuitToken.getAddress()}",`);
  console.log(`  INTUIT_STAKING: "${await staking.getAddress()}"`);
  console.log("};");
  
  console.log("\n🔧 Staking Details:");
  console.log("• Reward Rate: 0.1% per second per INTUIT staked");
  console.log("• Min Stake: 10 INTUIT");
  console.log("• No lock period - unstake anytime");
  console.log("• Real INTUIT rewards paid out");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });