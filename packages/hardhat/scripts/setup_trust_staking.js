const { ethers } = require("hardhat");

async function main() {
  console.log("🏦 SETTING UP TRUST STAKING");
  console.log("=============================");
  
  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);
  
  // Contract addresses
  const universalStakingAddress = "0xbab02368889f73ebBC506F7482b203195c48783E";
  const intuitAddress = "0xe8bD8876CB6f97663c668faae65C4Da579FfA0B5";
  
  // Get contracts
  const universalStaking = await ethers.getContractAt("UniversalStaking", universalStakingAddress);
  const intuitToken = await ethers.getContractAt("Intuit", intuitAddress);
  
  // Add TRUST staking pool (native token address = 0x0)
  console.log("\n📝 1. Adding TRUST staking pool...");
  const trustPoolTx = await universalStaking.addPool(
    ethers.ZeroAddress, // TRUST (native token)
    ethers.parseEther("0.001"), // 0.1% reward rate per second
    ethers.parseEther("1") // min stake 1 TRUST
  );
  await trustPoolTx.wait();
  console.log("✅ TRUST pool added");
  
  // Add INTUIT staking pool  
  console.log("\n📝 2. Adding INTUIT staking pool...");
  const intuitPoolTx = await universalStaking.addPool(
    intuitAddress, // INTUIT token
    ethers.parseEther("0.002"), // 0.2% reward rate per second (higher than TRUST)
    ethers.parseEther("10") // min stake 10 INTUIT
  );
  await intuitPoolTx.wait();
  console.log("✅ INTUIT pool added");
  
  // Fund rewards with INTUIT tokens
  console.log("\n💰 3. Funding reward pools...");
  const rewardAmount = ethers.parseEther("100000"); // 100k INTUIT for rewards
  
  const approveTx = await intuitToken.approve(universalStakingAddress, rewardAmount);
  await approveTx.wait();
  
  const fundTx = await universalStaking.fundRewardPool(intuitAddress, rewardAmount);
  await fundTx.wait();
  console.log(`✅ Funded with ${ethers.formatEther(rewardAmount)} INTUIT rewards`);
  
  console.log("\n🎉 UNIVERSAL STAKING SETUP COMPLETE!");
  console.log("====================================");
  console.log("Available staking:");
  console.log("• TRUST (native) → Earn INTUIT rewards");
  console.log("• INTUIT (ERC20) → Earn INTUIT rewards");
  console.log("\nContract address:", universalStakingAddress);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });