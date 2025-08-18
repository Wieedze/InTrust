import hre from "hardhat";

async function main() {
  console.log("🔍 DEBUGGING STAKING ISSUE");
  console.log("==========================");

  // Contract addresses
  const intuitAddress = "0x3Aa5ebB10DC797CAC828524e59A333d0A371443c";
  const stakerAddress = "0x59b670e9fA9D0A427751Af201D676719a970857b";
  
  // User address (from the error message)
  const userAddress = "0xd7512902999b34af2B2940Eb8827CC8345DC77C6";

  console.log(`\n📍 Contract Addresses:`);
  console.log(`INTUIT Token: ${intuitAddress}`);
  console.log(`IntuitStaker: ${stakerAddress}`);
  console.log(`User Address: ${userAddress}`);

  // Get contract instances
  const intuitContract = await hre.ethers.getContractAt("Intuit", intuitAddress);
  const stakerContract = await hre.ethers.getContractAt("IntuitStaker", stakerAddress);

  try {
    // Check user's INTUIT token balance
    const userIntuitBalance = await intuitContract.balanceOf(userAddress);
    console.log(`\n💰 User INTUIT Token Balance: ${hre.ethers.formatEther(userIntuitBalance)} INTUIT`);

    // Check user's staked balance in the staker contract
    const userStakedBalance = await stakerContract.balances(userAddress);
    console.log(`📊 User Staked Balance: ${hre.ethers.formatEther(userStakedBalance)} INTUIT`);

    // Check user's stake timestamp
    const userStakeTimestamp = await stakerContract.stakeTimestamp(userAddress);
    console.log(`⏰ User Stake Timestamp: ${userStakeTimestamp.toString()} (${userStakeTimestamp > 0 ? new Date(Number(userStakeTimestamp) * 1000).toLocaleString() : 'No stake'})`);

    // Check user's pending rewards
    const userRewards = await stakerContract.rewards(userAddress);
    console.log(`🎁 User Pending Rewards: ${hre.ethers.formatEther(userRewards)} INTUIT`);

    // Get overall staking status
    console.log(`\n📈 Staking Contract Status:`);
    const stakingStatus = await stakerContract.getStakingStatus();
    const [currentStaked, thresholdAmount, timeRemaining, isCompleted, withdrawalsOpen, currentRewardPool] = stakingStatus;
    
    console.log(`- Total Staked: ${hre.ethers.formatEther(currentStaked)} INTUIT`);
    console.log(`- Threshold: ${hre.ethers.formatEther(thresholdAmount)} INTUIT`);
    console.log(`- Time Remaining: ${timeRemaining.toString()} seconds`);
    console.log(`- Is Completed: ${isCompleted}`);
    console.log(`- Withdrawals Open: ${withdrawalsOpen}`);
    console.log(`- Reward Pool: ${hre.ethers.formatEther(currentRewardPool)} INTUIT`);

    // Check individual contract variables
    console.log(`\n🔍 Contract Variables:`);
    const totalStaked = await stakerContract.totalStaked();
    const stakingCompleted = await stakerContract.stakingCompleted();
    const openForWithdraw = await stakerContract.openForWithdraw();
    const deadline = await stakerContract.deadline();
    
    console.log(`- Total Staked: ${hre.ethers.formatEther(totalStaked)} INTUIT`);
    console.log(`- Staking Completed: ${stakingCompleted}`);
    console.log(`- Open for Withdraw: ${openForWithdraw}`);
    console.log(`- Deadline: ${deadline.toString()} (${new Date(Number(deadline) * 1000).toLocaleString()})`);

    // Check constants
    const threshold = await stakerContract.THRESHOLD();
    const rewardRate = await stakerContract.REWARD_RATE();
    const lockPeriod = await stakerContract.LOCK_PERIOD();
    const earlyUnstakeFee = await stakerContract.EARLY_UNSTAKE_FEE();
    
    console.log(`\n⚙️  Contract Constants:`);
    console.log(`- Threshold: ${hre.ethers.formatEther(threshold)} INTUIT`);
    console.log(`- Reward Rate: ${rewardRate.toString()}/1000 (${Number(rewardRate)/10}%)`);
    console.log(`- Lock Period: ${lockPeriod.toString()} seconds (${Number(lockPeriod)/86400} days)`);
    console.log(`- Early Unstake Fee: ${earlyUnstakeFee.toString()}/1000 (${Number(earlyUnstakeFee)/10}%)`);

    // Analyze the issue
    console.log(`\n🚨 ISSUE ANALYSIS:`);
    if (userStakedBalance === 0n) {
      console.log(`❌ Problem: User has NO staked tokens in the contract`);
      console.log(`   - User staked balance: ${hre.ethers.formatEther(userStakedBalance)} INTUIT`);
      console.log(`   - Cannot unstake when nothing is staked`);
    } else {
      console.log(`✅ User has staked tokens: ${hre.ethers.formatEther(userStakedBalance)} INTUIT`);
      
      // Check if it's a timing issue
      const currentTime = Math.floor(Date.now() / 1000);
      const stakeTime = Number(userStakeTimestamp);
      const lockEndTime = stakeTime + Number(lockPeriod);
      
      if (currentTime < lockEndTime && !withdrawalsOpen) {
        console.log(`⏰ Timing issue: Still in lock period`);
        console.log(`   - Staked at: ${new Date(stakeTime * 1000).toLocaleString()}`);
        console.log(`   - Lock ends: ${new Date(lockEndTime * 1000).toLocaleString()}`);
        console.log(`   - Current time: ${new Date(currentTime * 1000).toLocaleString()}`);
      }
    }

  } catch (error) {
    console.error("❌ Error checking staking status:", error);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
