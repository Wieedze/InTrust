import hre from "hardhat";

async function main() {
  console.log("🔍 DEBUGGING USER REWARDS");
  console.log("========================");

  const userAddress = "0xd7512902999b34af2B2940Eb8827CC8345DC77C6";
  
  // Contract addresses (from your deployment)
  const stakerAddress = "0x59b670e9fA9D0A427751Af201D676719a970857b";
  
  // Get contract instance
  const IntuitStaker = await hre.ethers.getContractFactory("IntuitStaker");
  const staker = IntuitStaker.attach(stakerAddress);
  
  console.log(`\n👤 Checking user: ${userAddress}`);
  console.log(`📋 Staker contract: ${stakerAddress}`);
  
  try {
    // Get user stake info
    const userStakeInfo = await staker.getUserStakeInfo(userAddress);
    const [stakedAmount, stakeTime, pendingRewards, canUnstakeWithoutFee] = userStakeInfo;
    
    console.log(`\n💰 User Stake Info:`);
    console.log(`- Staked Amount: ${hre.ethers.formatEther(stakedAmount)} INTUIT`);
    console.log(`- Stake Timestamp: ${stakeTime.toString()}`);
    console.log(`- Pending Rewards: ${hre.ethers.formatEther(pendingRewards)} INTUIT`);
    console.log(`- Can Unstake Without Fee: ${canUnstakeWithoutFee}`);
    
    // Get contract state
    const totalStaked = await staker.totalStaked();
    const THRESHOLD = await staker.THRESHOLD();
    const stakingCompleted = await staker.stakingCompleted();
    const rewardPool = await staker.rewardPool();
    const deadline = await staker.deadline();
    
    console.log(`\n📊 Contract State:`);
    console.log(`- Total Staked: ${hre.ethers.formatEther(totalStaked)} INTUIT`);
    console.log(`- Threshold Required: ${hre.ethers.formatEther(THRESHOLD)} INTUIT`);
    console.log(`- Threshold Met: ${totalStaked >= THRESHOLD ? "✅ YES" : "❌ NO"}`);
    console.log(`- Staking Completed: ${stakingCompleted ? "✅ YES" : "❌ NO"}`);
    console.log(`- Reward Pool: ${hre.ethers.formatEther(rewardPool)} INTUIT`);
    console.log(`- Deadline: ${new Date(Number(deadline) * 1000).toLocaleString()}`);
    
    // Check current time vs deadline
    const currentTime = Math.floor(Date.now() / 1000);
    const timeLeft = Number(deadline) - currentTime;
    
    console.log(`\n⏰ Timing Info:`);
    console.log(`- Current Time: ${new Date(currentTime * 1000).toLocaleString()}`);
    console.log(`- Time Left: ${timeLeft > 0 ? `${Math.floor(timeLeft / 86400)} days, ${Math.floor((timeLeft % 86400) / 3600)} hours` : "DEADLINE PASSED"}`);
    
    // Analyze why no rewards
    console.log(`\n🔍 REWARD ANALYSIS:`);
    
    if (!stakingCompleted) {
      if (timeLeft > 0) {
        console.log(`❌ REASON: Staking period not completed yet!`);
        console.log(`   - Someone needs to call execute() after the deadline`);
        console.log(`   - Deadline: ${new Date(Number(deadline) * 1000).toLocaleString()}`);
      } else {
        console.log(`⚠️  READY: Deadline passed but execute() not called yet!`);
        console.log(`   - You or anyone can call execute() to complete staking`);
        console.log(`   - This will distribute rewards if threshold is met`);
      }
    } else {
      if (totalStaked < THRESHOLD) {
        console.log(`❌ REASON: Threshold not met when staking completed`);
        console.log(`   - Only ${hre.ethers.formatEther(totalStaked)} INTUIT staked`);
        console.log(`   - Needed ${hre.ethers.formatEther(THRESHOLD)} INTUIT`);
      } else if (rewardPool == 0n) {
        console.log(`❌ REASON: No reward pool available`);
        console.log(`   - Reward pool is empty: ${hre.ethers.formatEther(rewardPool)} INTUIT`);
      } else {
        console.log(`✅ SHOULD HAVE REWARDS!`);
        console.log(`   - Threshold met: ${hre.ethers.formatEther(totalStaked)} >= ${hre.ethers.formatEther(THRESHOLD)}`);
        console.log(`   - Staking completed: ${stakingCompleted}`);
        console.log(`   - Reward pool: ${hre.ethers.formatEther(rewardPool)} INTUIT`);
        console.log(`   - Your share: ${hre.ethers.formatEther(pendingRewards)} INTUIT`);
      }
    }
    
    // Check if we can call execute
    if (!stakingCompleted && timeLeft <= 0) {
      console.log(`\n🚀 NEXT STEP: Call execute() to complete staking!`);
      console.log(`   - Run: yarn hardhat run scripts/execute_staking.ts --network intuition`);
    }
    
  } catch (error) {
    console.error(`❌ Error checking user rewards:`, error);
  }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });

