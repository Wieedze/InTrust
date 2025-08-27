import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { Contract } from "ethers";

/**
 * Deploy INTUIT ecosystem with custom tokenomics
 * - Intuit.sol (1M supply ERC20 token)
 * - 7% (70K) → Dev wallet: 0xd7512902999b34af2B2940Eb8827CC8345DC77C6
 * - 60% (600K) → DEX pool liquidity
 * - 33% (330K) → Governance/Airdrop (15% governance + 18% staking rewards)
 * - IntuitDEX.sol (TTRUST ↔ INTUIT AMM) - Initialize with 1000 TTRUST
 * - IntuitStaker.sol (Staking contract)
 */
const deployIntuitNoVesting: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  console.log("\n🚀 DEPLOYING INTUIT ECOSYSTEM (CUSTOM TOKENOMICS)");
  console.log("=================================================");
  console.log(`Deployer: ${deployer}`);
  
  // Define addresses and allocations
  const DEV_WALLET = "0xd7512902999b34af2B2940Eb8827CC8345DC77C6";
  const TOTAL_SUPPLY = hre.ethers.parseEther("1000000"); // 1M tokens
  const DEV_ALLOCATION = TOTAL_SUPPLY * BigInt(7) / BigInt(100);    // 7% = 70K
  const DEX_ALLOCATION = TOTAL_SUPPLY * BigInt(60) / BigInt(100);   // 60% = 600K
  const GOVERNANCE_ALLOCATION = TOTAL_SUPPLY * BigInt(15) / BigInt(100); // 15% = 150K
  const STAKING_ALLOCATION = TOTAL_SUPPLY * BigInt(18) / BigInt(100);     // 18% = 180K
  
  console.log(`\n📊 Token Distribution:`);
  console.log(`- Dev Wallet (${DEV_WALLET}): ${hre.ethers.formatEther(DEV_ALLOCATION)} INTUIT (7%)`);
  console.log(`- DEX Pool: ${hre.ethers.formatEther(DEX_ALLOCATION)} INTUIT (60%)`);
  console.log(`- Governance/Airdrop: ${hre.ethers.formatEther(GOVERNANCE_ALLOCATION)} INTUIT (15%)`);
  console.log(`- Staking Rewards: ${hre.ethers.formatEther(STAKING_ALLOCATION)} INTUIT (18%)`);
  console.log(`- Total: ${hre.ethers.formatEther(TOTAL_SUPPLY)} INTUIT (100%)`);

  // Check deployer TTRUST balance
  const deployerTtrustBalance = await hre.ethers.provider.getBalance(deployer);
  const requiredTtrust = hre.ethers.parseEther("1000");
  const gasReserve = hre.ethers.parseEther("10"); // Keep 10 TTRUST for gas

  console.log(`\n💰 Balance Check:`);
  console.log(`Deployer TTRUST: ${hre.ethers.formatEther(deployerTtrustBalance)}`);
  console.log(`Required for DEX: ${hre.ethers.formatEther(requiredTtrust)}`);
  console.log(`Gas Reserve: ${hre.ethers.formatEther(gasReserve)}`);

  if (deployerTtrustBalance < requiredTtrust + gasReserve) {
    console.log(`❌ Insufficient TTRUST! Need: ${hre.ethers.formatEther(requiredTtrust + gasReserve)}`);
    console.log(`Have: ${hre.ethers.formatEther(deployerTtrustBalance)}`);
    return false;
  }

  // Step 1: Deploy INTUIT Token (all tokens go to deployer)
  console.log("\n📝 Step 1: Deploying INTUIT Token...");
  const intuitToken = await deploy("Intuit", {
    from: deployer,
    args: [],
    log: true,
    autoMine: true,
  });

  console.log(`✅ INTUIT Token deployed at: ${intuitToken.address}`);

  // Step 2: Deploy Factory DEX System
  console.log("\n🔄 Step 2: Deploying Factory DEX System...");
  
  // Deploy WETH
  const weth = await deploy("WETH", {
    from: deployer,
    args: [],
    log: true,
    autoMine: true,
  });
  console.log(`✅ WETH deployed at: ${weth.address}`);
  
  // Deploy Factory
  const dexFactory = await deploy("DEXFactory", {
    from: deployer,
    args: [deployer], // feeToSetter
    log: true,
    autoMine: true,
  });
  console.log(`✅ DEX Factory deployed at: ${dexFactory.address}`);
  
  // Deploy Router
  const dexRouter = await deploy("DEXRouter", {
    from: deployer,
    args: [dexFactory.address, weth.address],
    log: true,
    autoMine: true,
  });
  console.log(`✅ DEX Router deployed at: ${dexRouter.address}`);

  // Step 3: Deploy Staking Contract
  console.log("\n🏦 Step 3: Deploying Staking Contract...");
  const intuitStaker = await deploy("IntuitStaker", {
    from: deployer,
    args: [intuitToken.address],
    log: true,
    autoMine: true,
  });

  console.log(`✅ Staker deployed at: ${intuitStaker.address}`);

  // Step 4: Distribute tokens according to tokenomics
  console.log("\n💰 Step 4: Distributing tokens according to tokenomics...");
  
  const tokenContract = await hre.ethers.getContractAt("Intuit", intuitToken.address);
  const routerContract = await hre.ethers.getContractAt("DEXRouter", dexRouter.address);
  const factoryContract = await hre.ethers.getContractAt("DEXFactory", dexFactory.address);

  // Send 7% to dev wallet
  console.log(`\n📤 Sending ${hre.ethers.formatEther(DEV_ALLOCATION)} INTUIT to dev wallet...`);
  const devTransferTx = await tokenContract.transfer(DEV_WALLET, DEV_ALLOCATION);
  await devTransferTx.wait();
  console.log(`✅ Dev allocation sent to ${DEV_WALLET}`);

  // Step 5: Initialize DEX with 1000 TTRUST and 60% of tokens
  console.log("\n💧 Step 5: Initializing DEX with 1000 TTRUST liquidity...");
  
  const ttrustLiquidity = hre.ethers.parseEther("1000"); // 1000 TTRUST from deployer wallet
  const intuitLiquidity = DEX_ALLOCATION; // 60% = 600K INTUIT

  console.log(`TTRUST Liquidity: ${hre.ethers.formatEther(ttrustLiquidity)} (from deployer wallet)`);
  console.log(`INTUIT Liquidity: ${hre.ethers.formatEther(intuitLiquidity)}`);
  console.log(`Initial Rate: 1 TTRUST = ${(Number(hre.ethers.formatEther(intuitLiquidity)) / Number(hre.ethers.formatEther(ttrustLiquidity))).toFixed(0)} INTUIT`);

  // Check token balance
  const deployerIntuitBalance = await tokenContract.balanceOf(deployer);
  console.log(`\nDeployer INTUIT balance: ${hre.ethers.formatEther(deployerIntuitBalance)}`);

  if (deployerIntuitBalance < intuitLiquidity) {
    console.log(`❌ Insufficient INTUIT tokens for liquidity`);
    return false;
  }

  // Create WETH/INTUIT pair
  console.log("\n🔗 Creating WETH/INTUIT pair...");
  const createPairTx = await factoryContract.createPair(weth.address, intuitToken.address);
  await createPairTx.wait();
  const pairAddress = await factoryContract.getPair(weth.address, intuitToken.address);
  console.log(`✅ Pair created at: ${pairAddress}`);

  // Approve Router to spend INTUIT tokens
  console.log("\n📝 Approving Router to spend INTUIT...");
  const approveTx = await tokenContract.approve(dexRouter.address, intuitLiquidity);
  await approveTx.wait();
  console.log("✅ INTUIT spending approved");

  // Add initial liquidity
  console.log("\n🚀 Adding initial liquidity...");
  const deadline = Math.floor(Date.now() / 1000) + 1200; // 20 minutes
  const addLiquidityTx = await routerContract.addLiquidityETH(
    intuitToken.address,
    intuitLiquidity,
    0, // amountTokenMin
    0, // amountETHMin
    deployer, // to
    deadline,
    { value: ttrustLiquidity }
  );
  
  console.log(`Transaction hash: ${addLiquidityTx.hash}`);
  await addLiquidityTx.wait();
  console.log("✅ Initial liquidity added successfully!");

  // Step 6: Setup staking reward pool (18% of total supply)
  console.log("\n🎁 Step 6: Setting up staking reward pool...");
  
  const stakerContract = await hre.ethers.getContractAt("IntuitStaker", intuitStaker.address);
  
  console.log(`Funding reward pool with: ${hre.ethers.formatEther(STAKING_ALLOCATION)} INTUIT (18% of supply)`);
  
  // Approve and fund reward pool
  const approveRewardTx = await tokenContract.approve(intuitStaker.address, STAKING_ALLOCATION);
  await approveRewardTx.wait();
  
  const fundTx = await stakerContract.fundRewardPool(STAKING_ALLOCATION);
  await fundTx.wait();
  console.log(`✅ Reward pool funded with ${hre.ethers.formatEther(STAKING_ALLOCATION)} INTUIT`);

  // Step 7: Verify final setup
  console.log("\n📊 Final Status:");
  
  const pairContract = await hre.ethers.getContractAt("DEXPair", pairAddress);
  const [ttrustReserve, intuitReserve] = await pairContract.getReserves();
  const totalLiquidity = await pairContract.totalLiquidity();
  const finalDeployerBalance = await tokenContract.balanceOf(deployer);
  
  console.log(`\nDEX Reserves:`);
  console.log(`- TTRUST: ${hre.ethers.formatEther(ttrustReserve)}`);
  console.log(`- INTUIT: ${hre.ethers.formatEther(intuitReserve)}`);
  console.log(`- Total Liquidity: ${totalLiquidity.toString()}`);
  console.log(`- Exchange Rate: 1 TTRUST = ${(Number(hre.ethers.formatEther(intuitReserve)) / Number(hre.ethers.formatEther(ttrustReserve))).toFixed(2)} INTUIT`);

  console.log(`\nFinal Token Distribution:`);
  const devBalance = await tokenContract.balanceOf(DEV_WALLET);
  const stakerBalance = await tokenContract.balanceOf(intuitStaker.address);
  
  console.log(`- Dev Wallet: ${hre.ethers.formatEther(devBalance)} INTUIT (7%)`);
  console.log(`- DEX Pool: ${hre.ethers.formatEther(intuitReserve)} INTUIT (60%)`);
  console.log(`- Staker Rewards: ${hre.ethers.formatEther(stakerBalance)} INTUIT (18%)`);
  console.log(`- Governance/Airdrop (Deployer): ${hre.ethers.formatEther(finalDeployerBalance)} INTUIT (15%)`);
  
  // Verify total adds up to 1M
  const totalDistributed = devBalance + intuitReserve + stakerBalance + finalDeployerBalance;
  console.log(`- Total Distributed: ${hre.ethers.formatEther(totalDistributed)} INTUIT (should be 1M)`);

  // Step 8: Display Deployment Summary
  console.log("\n🎉 DEPLOYMENT COMPLETE!");
  console.log("========================");
  console.log(`🪙 INTUIT Token: ${intuitToken.address}`);
  console.log(`🏭 DEX Factory: ${dexFactory.address}`);
  console.log(`🔄 DEX Router: ${dexRouter.address}`);
  console.log(`💰 WETH: ${weth.address}`);
  console.log(`🔗 WETH/INTUIT Pair: ${pairAddress}`);
  console.log(`🏦 Staker: ${intuitStaker.address}`);
  
  console.log("\n✅ All systems ready:");
  console.log("1. ✅ DEX initialized with 1000 TTRUST + 600K INTUIT liquidity");
  console.log("2. ✅ 70K INTUIT sent to dev wallet");
  console.log("3. ✅ 150K INTUIT reserved for governance/airdrop");
  console.log("4. ✅ 180K INTUIT allocated to staking rewards (3.6x more rewards!)");
  console.log("5. ✅ All contracts deployed and ready for trading/staking!");
  
  console.log("\n🔗 Contract Verification Commands:");
  console.log(`npx hardhat verify --network intuition ${intuitToken.address}`);
  console.log(`npx hardhat verify --network intuition ${dexFactory.address} ${deployer}`);
  console.log(`npx hardhat verify --network intuition ${dexRouter.address} ${dexFactory.address} ${weth.address}`);
  console.log(`npx hardhat verify --network intuition ${weth.address}`);
  console.log(`npx hardhat verify --network intuition ${intuitStaker.address} ${intuitToken.address}`);

  return true;
};

export default deployIntuitNoVesting;
deployIntuitNoVesting.tags = ["IntuitNoVesting", "Intuit", "DEXFactory", "DEXRouter", "WETH", "IntuitStaker"];
deployIntuitNoVesting.dependencies = [];
deployIntuitNoVesting.id = "deploy_intuit_no_vesting";
