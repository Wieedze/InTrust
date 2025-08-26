import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { Contract } from "ethers";

/**
 * Deploy IntuitStaker contract for decentralized staking
 */
const deployIntuitStaker: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  console.log("\n🏦 DEPLOYING INTUIT STAKER CONTRACT");
  console.log("==================================");
  console.log(`Deployer: ${deployer}`);

  // Get the deployed INTUIT token address
  const intuitDeployment = await hre.deployments.get("Intuit");
  console.log(`INTUIT Token: ${intuitDeployment.address}`);

  // Deploy IntuitStaker contract
  console.log("\n📝 Deploying IntuitStaker...");
  const intuitStaker = await deploy("IntuitStaker", {
    from: deployer,
    args: [intuitDeployment.address],
    log: true,
    autoMine: true,
  });

  console.log(`✅ IntuitStaker deployed at: ${intuitStaker.address}`);

  // Get contract instances for setup
  const intuitContract = await hre.ethers.getContractAt("Intuit", intuitDeployment.address);
  const stakerContract = await hre.ethers.getContractAt("IntuitStaker", intuitStaker.address);

  // Fund the staker contract with initial reward pool (optional)
  console.log("\n💰 Setting up initial reward pool...");

  const deployerBalance = await intuitContract.balanceOf(deployer);
  console.log(`Deployer INTUIT balance: ${hre.ethers.formatEther(deployerBalance)}`);

  console.log("⚠️  Skipping reward pool funding - handled by IntuitNoVesting deployment script");

  // Display staking contract info
  console.log("\n📊 Staking Contract Info:");
  console.log(`Contract Address: ${intuitStaker.address}`);
  console.log(`INTUIT Token: ${intuitDeployment.address}`);
  console.log(`Threshold: 10,000 INTUIT`);
  console.log(`Reward Rate: 12.5% APY`);
  console.log(`Lock Period: 7 days`);
  console.log(`Early Unstake Fee: 2%`);

  const stakingStatus = await stakerContract.getStakingStatus();
  const [currentStaked, thresholdAmount, timeRemaining, isCompleted, withdrawalsOpen, currentRewardPool] =
    stakingStatus;

  console.log(`\nCurrent Status:`);
  console.log(`- Time Remaining: ${timeRemaining} seconds`);
  console.log(`- Current Staked: ${hre.ethers.formatEther(currentStaked)} INTUIT`);
  console.log(`- Threshold: ${hre.ethers.formatEther(thresholdAmount)} INTUIT`);
  console.log(`- Reward Pool: ${hre.ethers.formatEther(currentRewardPool)} INTUIT`);
  console.log(`- Is Completed: ${isCompleted}`);
  console.log(`- Withdrawals Open: ${withdrawalsOpen}`);

  console.log("\n🎉 IntuitStaker deployment complete!");
  console.log(`\n📝 Next steps:`);
  console.log(`1. Update StakeInterface.tsx with contract address: ${intuitStaker.address}`);
  console.log(`2. Test staking functionality in the frontend`);
  console.log(`3. Users can now stake INTUIT tokens for collective rewards!`);

  return true;
};

export default deployIntuitStaker;
deployIntuitStaker.tags = ["IntuitStaker"];
deployIntuitStaker.dependencies = ["IntuitNoVesting"];
deployIntuitStaker.id = "deploy_intuit_staker_standalone";
