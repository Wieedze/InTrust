import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

/**
 * Deploy DEX Factory Pattern for Universal Token Swapping
 * - DEXFactory.sol (Creates and manages all trading pairs)
 * - DEXRouter.sol (Simplified user interface for swaps and liquidity)
 * - Create initial TTRUST/INTUIT pair
 */
const deployDEXFactory: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  console.log("\n🏭 DEPLOYING DEX FACTORY ECOSYSTEM");
  console.log("==================================");
  console.log(`Deployer: ${deployer}`);

  // Step 1: Deploy DEX Factory
  console.log("\n📝 Step 1: Deploying DEX Factory...");
  const dexFactory = await deploy("DEXFactory", {
    from: deployer,
    args: [deployer], // feeToSetter
    log: true,
    autoMine: true,
  });

  console.log(`✅ DEX Factory deployed at: ${dexFactory.address}`);

  // Step 2: Deploy WETH
  console.log("\n💰 Step 2: Deploying WETH...");
  const weth = await deploy("WETH", {
    from: deployer,
    args: [],
    log: true,
    autoMine: true,
  });

  console.log(`✅ WETH deployed at: ${weth.address}`);

  // Step 3: Deploy DEX Router
  console.log("\n🔀 Step 3: Deploying DEX Router...");

  const dexRouter = await deploy("DEXRouter", {
    from: deployer,
    args: [dexFactory.address, weth.address],
    log: true,
    autoMine: true,
  });

  console.log(`✅ DEX Router deployed at: ${dexRouter.address}`);

  // Step 4: Get existing token addresses
  let intuitTokenAddress;
  try {
    const intuitDeployment = await hre.deployments.get("Intuit");
    intuitTokenAddress = intuitDeployment.address;
    console.log(`\n🪙 Found existing INTUIT Token: ${intuitTokenAddress}`);
  } catch {
    console.log("\n⚠️  No existing INTUIT token found. Deploy tokens first.");
    return true;
  }

  // Step 5: Create initial WTTRUST/INTUIT pair
  console.log("\n🔗 Step 5: Creating initial trading pairs...");

  const factoryContract = await hre.ethers.getContractAt("DEXFactory", dexFactory.address);

  // Create WTTRUST/INTUIT pair
  console.log(`Creating WTTRUST/INTUIT pair...`);
  const createPairTx = await factoryContract.createPair(weth.address, intuitTokenAddress);
  await createPairTx.wait();

  const pairAddress = await factoryContract.getPair(weth.address, intuitTokenAddress);
  console.log(`✅ WTTRUST/INTUIT pair created at: ${pairAddress}`);

  // Step 6: Display Factory Information
  console.log("\n📊 Factory Information:");
  const totalPairs = await factoryContract.allPairsLength();
  console.log(`Total Pairs Created: ${totalPairs}`);
  console.log(`Fee Recipient: ${await factoryContract.feeTo()}`);
  console.log(`Fee Setter: ${await factoryContract.feeToSetter()}`);

  // Step 7: Display Usage Instructions
  console.log("\n🎉 DEX FACTORY DEPLOYMENT COMPLETE!");
  console.log("===================================");
  console.log(`🏭 DEX Factory: ${dexFactory.address}`);
  console.log(`🔀 DEX Router: ${dexRouter.address}`);
  console.log(`💰 WETH: ${weth.address}`);
  console.log(`🔗 Initial Pair: ${pairAddress}`);

  console.log("\n📋 How to use your Universal DEX:");
  console.log("1. 🆕 Create new pairs: factory.createPair(tokenA, tokenB)");
  console.log("2. 💧 Add liquidity: router.addLiquidity(...)");
  console.log("3. 🔄 Swap tokens: router.swapExactTokensForTokens(...)");
  console.log("4. 🔍 Multi-hop swaps: router.swapExactTokensForTokens([tokenA, tokenB, tokenC], ...)");
  console.log("5. 📈 Get prices: router.getAmountsOut(amountIn, [tokenA, tokenB])");

  console.log("\n💡 Example Frontend Integration:");
  console.log(`const factory = new ethers.Contract("${dexFactory.address}", factoryABI, signer);`);
  console.log(`const router = new ethers.Contract("${dexRouter.address}", routerABI, signer);`);
  console.log(`// Create any pair: await factory.createPair(token1, token2);`);
  console.log(`// Swap any tokens: await router.swapExactTokensForTokens(...);`);

  console.log("\n🔗 Contract Verification Commands:");
  console.log(`npx hardhat verify --network intuition ${dexFactory.address} ${deployer}`);
  console.log(`npx hardhat verify --network intuition ${weth.address}`);
  console.log(`npx hardhat verify --network intuition ${dexRouter.address} ${dexFactory.address} ${weth.address}`);

  // Step 8: Save deployment info
  const deploymentInfo = {
    network: hre.network.name,
    deployer: deployer,
    timestamp: new Date().toISOString(),
    contracts: {
      DEXFactory: {
        address: dexFactory.address,
        feeToSetter: deployer,
        totalPairs: totalPairs.toString(),
      },
      DEXRouter: {
        address: dexRouter.address,
        factory: dexFactory.address,
        WETH: weth.address,
      },
      WETH: {
        address: weth.address,
        name: "Wrapped TTRUST",
        symbol: "WTTRUST",
      },
      InitialPair: {
        address: pairAddress,
        token0: weth.address,
        token1: intuitTokenAddress,
      },
    },
    features: {
      universalSwapping: true,
      multiHopSwaps: true,
      liquidityProvision: true,
      feeCollection: true,
    },
  };

  console.log("\n💾 Deployment Info:");
  console.log(JSON.stringify(deploymentInfo, null, 2));

  return true;
};

export default deployDEXFactory;
deployDEXFactory.tags = ["DEXFactory", "DEXRouter", "UniversalDEX"];
deployDEXFactory.dependencies = [];
deployDEXFactory.id = "deploy_dex_factory";
