import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { Contract } from "ethers";

/**
 * Final deployment of audited INTUIT ecosystem
 * - Intuit.sol (1M supply ERC20 token)
 * - IntuitTreasuryV2.sol (85% vesting treasury)
 * - IntuitDEX.sol (TTRUST ↔ INTUIT AMM)
 */
const deployIntuitFinal: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  console.log("\n🚀 DEPLOYING FINAL INTUIT ECOSYSTEM");
  console.log("===================================");
  console.log(`Deployer: ${deployer}`);

  // Step 1: Deploy INTUIT Token
  console.log("\n📝 Step 1: Deploying INTUIT Token...");
  const intuitToken = await deploy("Intuit", {
    from: deployer,
    args: [],
    log: true,
    autoMine: true,
  });

  console.log(`✅ INTUIT Token deployed at: ${intuitToken.address}`);

  // Step 2: Deploy Treasury Contract
  console.log("\n🏦 Step 2: Deploying Treasury Contract...");
  const intuitTreasury = await deploy("IntuitTreasuryV2", {
    from: deployer,
    args: [intuitToken.address],
    log: true,
    autoMine: true,
  });

  console.log(`✅ Treasury deployed at: ${intuitTreasury.address}`);

  // Step 3: Deploy DEX Contract
  console.log("\n🔄 Step 3: Deploying DEX Contract...");
  const intuitDEX = await deploy("IntuitDEX", {
    from: deployer,
    args: [intuitToken.address],
    log: true,
    autoMine: true,
  });

  console.log(`✅ DEX deployed at: ${intuitDEX.address}`);

  // Step 4: Configure Token Distribution
  console.log("\n💰 Step 4: Configuring Token Distribution...");
  
  const tokenContract = await hre.ethers.getContractAt("Intuit", intuitToken.address);
  const treasuryContract = await hre.ethers.getContractAt("IntuitTreasuryV2", intuitTreasury.address);

  // Calculate allocations
  const totalSupply = await tokenContract.TOTAL_SUPPLY();
  const treasuryAllocation = totalSupply * BigInt(85) / BigInt(100); // 85%
  const dexAllocation = totalSupply * BigInt(15) / BigInt(100); // 15%

  console.log(`Total Supply: ${hre.ethers.formatEther(totalSupply)} INTUIT`);
  console.log(`Treasury Allocation: ${hre.ethers.formatEther(treasuryAllocation)} INTUIT (85%)`);
  console.log(`DEX Allocation: ${hre.ethers.formatEther(dexAllocation)} INTUIT (15%)`);

  // Transfer 85% to Treasury
  console.log("\n📤 Transferring 85% to Treasury...");
  const transferTx = await tokenContract.transfer(intuitTreasury.address, treasuryAllocation);
  await transferTx.wait();
  console.log(`✅ Transferred ${hre.ethers.formatEther(treasuryAllocation)} INTUIT to Treasury`);

  // Verify balances
  const deployerBalance = await tokenContract.balanceOf(deployer);
  const treasuryBalance = await tokenContract.balanceOf(intuitTreasury.address);
  
  console.log("\n📊 Final Token Distribution:");
  console.log(`Deployer (DEX): ${hre.ethers.formatEther(deployerBalance)} INTUIT`);
  console.log(`Treasury: ${hre.ethers.formatEther(treasuryBalance)} INTUIT`);

  // Step 5: Display Deployment Summary
  console.log("\n🎉 DEPLOYMENT COMPLETE!");
  console.log("========================");
  console.log(`🪙 INTUIT Token: ${intuitToken.address}`);
  console.log(`🏦 Treasury: ${intuitTreasury.address}`);
  console.log(`🔄 DEX: ${intuitDEX.address}`);
  
  console.log("\n📋 Next Steps:");
  console.log("1. Initialize DEX with liquidity using init() function");
  console.log("2. Update frontend with new contract addresses");
  console.log("3. Start trading TTRUST ↔ INTUIT");
  
  console.log("\n🔗 Contract Verification Commands:");
  console.log(`npx hardhat verify --network intuition ${intuitToken.address}`);
  console.log(`npx hardhat verify --network intuition ${intuitTreasury.address} ${intuitToken.address}`);
  console.log(`npx hardhat verify --network intuition ${intuitDEX.address} ${intuitToken.address}`);

  // Step 6: Save deployment info
  const deploymentInfo = {
    network: hre.network.name,
    deployer: deployer,
    timestamp: new Date().toISOString(),
    contracts: {
      IntuitToken: {
        address: intuitToken.address,
        totalSupply: hre.ethers.formatEther(totalSupply),
      },
      IntuitTreasury: {
        address: intuitTreasury.address,
        allocation: hre.ethers.formatEther(treasuryAllocation),
        vestingPeriod: "4 years with 6-month cliff",
      },
      IntuitDEX: {
        address: intuitDEX.address,
        fee: "0.3%",
        formula: "Constant Product (x*y=k)",
      },
    },
    distribution: {
      treasury: "85%",
      dex: "15%",
    },
  };

  console.log("\n💾 Deployment Info:");
  console.log(JSON.stringify(deploymentInfo, null, 2));

  return true;
};

export default deployIntuitFinal;
deployIntuitFinal.tags = ["IntuitFinal", "Intuit", "IntuitTreasury", "IntuitDEX"];
deployIntuitFinal.dependencies = [];
deployIntuitFinal.id = "deploy_intuit_final";
