import { ethers } from "hardhat";

async function main() {
  console.log("🎯 Adding WTRUST pool to UniversalStaking...");

  // Get the deployed contract
  const universalStaking = await ethers.getContract("UniversalStaking");
  console.log("📍 UniversalStaking at:", await universalStaking.getAddress());

  // WTRUST token configuration
  const wtrustConfig = {
    name: "WTRUST",
    address: "0xD5ac451B0c50B9476107823Af206eD814a2e2580", // Newly deployed WTRUST
    rewardRate: ethers.parseEther("0.002"), // 0.002 token par seconde (higher rate for TRUST)
    minStakeAmount: ethers.parseEther("1"), // Minimum 1 WTRUST
    lockPeriod: 0, // Pas de lock
  };

  try {
    console.log(`🔄 Creating pool for ${wtrustConfig.name}...`);
    
    const tx = await universalStaking.createPool(
      wtrustConfig.address,
      wtrustConfig.rewardRate,
      wtrustConfig.minStakeAmount,
      wtrustConfig.lockPeriod
    );
    
    console.log("⏳ Transaction sent:", tx.hash);
    await tx.wait();
    
    console.log(`✅ Pool created for ${wtrustConfig.name}!`);
    console.log(`📊 Details:`);
    console.log(`   - Address: ${wtrustConfig.address}`);
    console.log(`   - Reward Rate: ${ethers.formatEther(wtrustConfig.rewardRate)} per second`);
    console.log(`   - Min Stake: ${ethers.formatEther(wtrustConfig.minStakeAmount)} WTRUST`);
    console.log(`   - Lock Period: ${wtrustConfig.lockPeriod} seconds (immediate unstaking)`);
    
    // Verify pool creation
    const poolInfo = await universalStaking.getPoolInfo(wtrustConfig.address);
    const [rewardRate, totalStaked, minStakeAmount, lockPeriod, isActive] = poolInfo;
    console.log(`\n✅ Pool verified:`);
    console.log(`   - Active: ${isActive}`);
    console.log(`   - Total Staked: ${ethers.formatEther(totalStaked)} WTRUST`);
    
  } catch (error) {
    console.error(`❌ Error creating pool for ${wtrustConfig.name}:`, error);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });