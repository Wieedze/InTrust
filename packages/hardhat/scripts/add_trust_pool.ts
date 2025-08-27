import { ethers } from "hardhat";

async function main() {
  console.log("🎯 Adding TRUST pool to UniversalStaking...");

  // Get the deployed contract
  const universalStaking = await ethers.getContract("UniversalStaking");
  console.log("📍 UniversalStaking at:", await universalStaking.getAddress());

  // TRUST token configuration
  const trustConfig = {
    name: "TRUST",
    address: "0xA54b4E6e356b963Ee00d1C947f478d9194a1a210",
    rewardRate: ethers.parseEther("0.001"), // 0.001 token par seconde
    minStakeAmount: ethers.parseEther("1"), // Minimum 1 TRUST
    lockPeriod: 0, // Pas de lock
  };

  try {
    console.log(`🔄 Creating pool for ${trustConfig.name}...`);
    
    const tx = await universalStaking.createPool(
      trustConfig.address,
      trustConfig.rewardRate,
      trustConfig.minStakeAmount,
      trustConfig.lockPeriod
    );
    
    console.log("⏳ Transaction sent:", tx.hash);
    await tx.wait();
    
    console.log(`✅ Pool created for ${trustConfig.name}!`);
    console.log(`📊 Details:`);
    console.log(`   - Address: ${trustConfig.address}`);
    console.log(`   - Reward Rate: ${ethers.formatEther(trustConfig.rewardRate)} per second`);
    console.log(`   - Min Stake: ${ethers.formatEther(trustConfig.minStakeAmount)} TRUST`);
    console.log(`   - Lock Period: ${trustConfig.lockPeriod} seconds (immediate unstaking)`);
    
  } catch (error) {
    console.error(`❌ Error creating pool for ${trustConfig.name}:`, error);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });