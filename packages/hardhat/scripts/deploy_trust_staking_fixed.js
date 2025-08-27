const { ethers } = require("hardhat");

async function main() {
  console.log("🔧 DEPLOYING FIXED TRUST STAKING");
  console.log("================================");
  
  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);
  
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("TRUST Balance:", ethers.formatEther(balance), "TRUST");
  
  // INTUIT token address (for rewards)
  const intuitAddress = "0xe8bD8876CB6f97663c668faae65C4Da579FfA0B5";
  
  // Deploy TrustStakingFixed contract
  console.log("\n📝 1. Deploying TrustStakingFixed...");
  const TrustStakingFixed = await ethers.getContractFactory("TrustStakingFixed");
  const trustStaking = await TrustStakingFixed.deploy(intuitAddress);
  await trustStaking.waitForDeployment();
  console.log("✅ TrustStakingFixed:", await trustStaking.getAddress());
  
  // Fund the staking contract with INTUIT rewards
  console.log("\n💰 2. Funding Staking Rewards...");
  const intuitToken = await ethers.getContractAt("Intuit", intuitAddress);
  const rewardAmount = ethers.parseEther("50000"); // 50k INTUIT for rewards
  
  const approveTx = await intuitToken.approve(await trustStaking.getAddress(), rewardAmount);
  await approveTx.wait();
  
  const fundTx = await trustStaking.fundRewardPool(rewardAmount);
  await fundTx.wait();
  console.log(`✅ Staking pool funded with ${ethers.formatEther(rewardAmount)} INTUIT rewards`);
  
  console.log("\n🎉 FIXED TRUST STAKING DEPLOYED!");
  console.log("===============================");
  console.log("📋 Contract Address:");
  console.log("TrustStakingFixed:", await trustStaking.getAddress());
  
  console.log("\n✅ FIXES Applied:");
  console.log("• No more rewards after complete unstaking");
  console.log("• Proper timestamp reset when amount = 0");
  console.log("• Clean reward calculation logic");
  
  console.log("\n📝 Interface Update:");
  console.log("Replace trustStakingAddress with:", `"${await trustStaking.getAddress()}"`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });