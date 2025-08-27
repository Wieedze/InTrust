import { ethers } from "hardhat";

async function main() {
  console.log("🔍 Checking user stake status...");

  const [deployer] = await ethers.getSigners();
  const universalStaking = await ethers.getContract("UniversalStaking");
  
  console.log("📍 UniversalStaking at:", await universalStaking.getAddress());
  console.log("👤 User address:", deployer.address);

  const trustAddress = "0xA54b4E6e356b963Ee00d1C947f478d9194a1a210";
  
  // Check TRUST token balance
  const trustToken = await ethers.getContractAt("IERC20", trustAddress);
  const userBalance = await trustToken.balanceOf(deployer.address);
  console.log(`💰 User TRUST balance: ${ethers.formatEther(userBalance)} TRUST`);
  
  // Check allowance
  const allowance = await trustToken.allowance(deployer.address, await universalStaking.getAddress());
  console.log(`✅ TRUST allowance to UniversalStaking: ${ethers.formatEther(allowance)} TRUST`);
  
  // Check pool info
  const poolInfo = await universalStaking.getPoolInfo(trustAddress);
  const [rewardRate, totalStaked, minStakeAmount, lockPeriod, isActive] = poolInfo;
  console.log(`\n📊 TRUST Pool Info:`);
  console.log(`   ✅ Active: ${isActive}`);
  console.log(`   📈 Total Staked: ${ethers.formatEther(totalStaked)} TRUST`);
  console.log(`   🔒 Min Stake: ${ethers.formatEther(minStakeAmount)} TRUST`);
  console.log(`   💰 Reward Rate: ${ethers.formatEther(rewardRate)} per second`);
  console.log(`   ⏰ Lock Period: ${lockPeriod} seconds`);
  
  // Check user stake info
  const userStakeInfo = await universalStaking.getUserStakeInfo(trustAddress, deployer.address);
  const [stakedAmount, stakeTime, pendingRewards, canUnstake] = userStakeInfo;
  console.log(`\n👤 User Stake Info:`);
  console.log(`   💎 Staked Amount: ${ethers.formatEther(stakedAmount)} TRUST`);
  console.log(`   ⏰ Stake Time: ${stakeTime.toString()}`);
  console.log(`   🎁 Pending Rewards: ${ethers.formatEther(pendingRewards)} TRUST`);
  console.log(`   🔓 Can Unstake: ${canUnstake}`);
  
  // Check recent transactions
  const latestBlock = await ethers.provider.getBlockNumber();
  console.log(`\n📋 Latest block: ${latestBlock}`);
  
  // Get recent events
  const stakeFilter = universalStaking.filters.Staked(deployer.address, trustAddress);
  const stakeEvents = await universalStaking.queryFilter(stakeFilter, latestBlock - 100);
  console.log(`\n📜 Recent stake events: ${stakeEvents.length}`);
  for (const event of stakeEvents) {
    console.log(`   Block ${event.blockNumber}: Staked ${ethers.formatEther(event.args[2])} TRUST`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });