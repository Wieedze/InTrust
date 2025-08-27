const { ethers } = require("hardhat");

async function main() {
  console.log("🏦 DEPLOYING TRUST STAKING");
  console.log("=========================");
  
  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);
  
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("TRUST Balance:", ethers.formatEther(balance), "TRUST");
  
  // INTUIT token address (for rewards)
  const intuitAddress = "0xe8bD8876CB6f97663c668faae65C4Da579FfA0B5";
  
  // Deploy TrustStaking contract
  console.log("\n📝 1. Deploying TrustStaking...");
  const TrustStaking = await ethers.getContractFactory("TrustStaking");
  const trustStaking = await TrustStaking.deploy(intuitAddress);
  await trustStaking.waitForDeployment();
  console.log("✅ TrustStaking:", await trustStaking.getAddress());
  
  // Fund the staking contract with INTUIT rewards
  console.log("\n💰 2. Funding Staking Rewards...");
  const intuitToken = await ethers.getContractAt("Intuit", intuitAddress);
  const rewardAmount = ethers.parseEther("50000"); // 50k INTUIT for rewards
  
  const approveTx = await intuitToken.approve(await trustStaking.getAddress(), rewardAmount);
  await approveTx.wait();
  
  const fundTx = await trustStaking.fundRewardPool(rewardAmount);
  await fundTx.wait();
  console.log(`✅ Staking pool funded with ${ethers.formatEther(rewardAmount)} INTUIT rewards`);
  
  console.log("\n🎉 TRUST STAKING DEPLOYED!");
  console.log("===========================");
  console.log("📋 Contract Address:");
  console.log("TrustStaking     :", await trustStaking.getAddress());
  
  console.log("\n✅ Staking Features:");
  console.log("• Stake TRUST (native) → Earn INTUIT rewards");
  console.log("• Minimum stake: 1 TRUST");
  console.log("• Reward rate: 0.1% per second");
  console.log("• 50k INTUIT reward pool");
  
  console.log("\n📝 Interface Configuration:");
  console.log("const TRUST_STAKING_ADDRESS =", `"${await trustStaking.getAddress()}";`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });