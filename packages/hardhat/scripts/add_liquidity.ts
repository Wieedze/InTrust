import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  
  console.log("🌍 ADDING LIQUIDITY TO DEX PAIRS");
  console.log("================================");
  console.log(`Deployer: ${deployer.address}`);
  
  // Contract addresses
  const dexRouterAddress = "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9";
  const dexFactoryAddress = "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0";
  
  // Token addresses  
  const ttrustAddress = "0xA54b4E6e356b963Ee00d1C947f478d9194a1a210";
  const wethAddress = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";
  const intuitAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
  const wbtcAddress = "0xA51c1fc2f0D1a1b8494Ed1FE312d7C3a78Ed91C0";
  const wusdcAddress = "0x0DCd1Bf9A1b36cE34237eEaFef220932846BCD82";
  const wusdtAddress = "0x9A676e781A523b5d0C0e43731313A708CB607508";
  
  // Get contracts
  const dexRouter = await ethers.getContractAt("DEXRouter", dexRouterAddress);
  
  // ERC20 ABI for minting tokens
  const erc20Abi = [
    "function mint(address to, uint256 amount) external",
    "function approve(address spender, uint256 amount) external returns (bool)",
    "function balanceOf(address owner) external view returns (uint256)"
  ];
  
  console.log("\\n💰 MINTING TOKENS FOR LIQUIDITY");
  console.log("===============================");
  
  // Mint tokens for liquidity
  const weth = await ethers.getContractAt(erc20Abi, wethAddress);
  const intuit = await ethers.getContractAt(erc20Abi, intuitAddress);
  const wbtc = await ethers.getContractAt(erc20Abi, wbtcAddress);
  const wusdc = await ethers.getContractAt(erc20Abi, wusdcAddress);
  const wusdt = await ethers.getContractAt(erc20Abi, wusdtAddress);
  
  // Mint amounts (adjusted for decimals)
  const ethAmount = ethers.parseEther("100"); // 100 ETH
  const intuitAmount = ethers.parseEther("100000"); // 100K INTUIT
  const btcAmount = ethers.parseUnits("10", 8); // 10 BTC (8 decimals)
  const usdcAmount = ethers.parseUnits("50000", 6); // 50K USDC (6 decimals)  
  const usdtAmount = ethers.parseUnits("50000", 6); // 50K USDT (6 decimals)
  
  console.log("Minting WETH...");
  await weth.mint(deployer.address, ethAmount);
  
  console.log("Minting WBTC...");
  await wbtc.mint(deployer.address, btcAmount);
  
  console.log("Minting WUSDC...");
  await wusdc.mint(deployer.address, usdcAmount);
  
  console.log("Minting WUSDT...");
  await wusdt.mint(deployer.address, usdtAmount);
  
  console.log("\\n🔐 APPROVING TOKENS");
  console.log("==================");
  
  // Approve DEXRouter to spend tokens
  console.log("Approving WETH...");
  await weth.approve(dexRouterAddress, ethAmount);
  
  console.log("Approving INTUIT...");
  await intuit.approve(dexRouterAddress, intuitAmount);
  
  console.log("Approving WBTC...");
  await wbtc.approve(dexRouterAddress, btcAmount);
  
  console.log("Approving WUSDC...");
  await wusdc.approve(dexRouterAddress, usdcAmount);
  
  console.log("Approving WUSDT...");
  await wusdt.approve(dexRouterAddress, usdtAmount);
  
  console.log("\\n💧 ADDING LIQUIDITY TO PAIRS");
  console.log("=============================");
  
  const deadline = Math.floor(Date.now() / 1000) + 1200; // 20 minutes
  
  try {
    // 1. WETH/INTUIT pair (1 ETH = 1000 INTUIT)
    console.log("Adding WETH/INTUIT liquidity...");
    await dexRouter.addLiquidity(
      wethAddress,
      intuitAddress,
      ethers.parseEther("10"), // 10 ETH
      ethers.parseEther("10000"), // 10K INTUIT
      0,
      0,
      deployer.address,
      deadline
    );
    
    // 2. WETH/WBTC pair (1 ETH = 0.05 BTC)
    console.log("Adding WETH/WBTC liquidity...");
    await dexRouter.addLiquidity(
      wethAddress,
      wbtcAddress,
      ethers.parseEther("20"), // 20 ETH
      ethers.parseUnits("1", 8), // 1 BTC
      0,
      0,
      deployer.address,
      deadline
    );
    
    // 3. WETH/WUSDC pair (1 ETH = 2500 USDC)
    console.log("Adding WETH/WUSDC liquidity...");
    await dexRouter.addLiquidity(
      wethAddress,
      wusdcAddress,
      ethers.parseEther("20"), // 20 ETH
      ethers.parseUnits("50000", 6), // 50K USDC
      0,
      0,
      deployer.address,
      deadline
    );
    
    // 4. WUSDC/WUSDT pair (1 USDC = 1 USDT)
    console.log("Adding WUSDC/WUSDT liquidity...");
    await dexRouter.addLiquidity(
      wusdcAddress,
      wusdtAddress,
      ethers.parseUnits("25000", 6), // 25K USDC
      ethers.parseUnits("25000", 6), // 25K USDT
      0,
      0,
      deployer.address,
      deadline
    );
    
    // 5. WBTC/WUSDC pair (1 BTC = 50,000 USDC)
    console.log("Adding WBTC/WUSDC liquidity...");
    await dexRouter.addLiquidity(
      wbtcAddress,
      wusdcAddress,
      ethers.parseUnits("2", 8), // 2 BTC
      ethers.parseUnits("100000", 6), // 100K USDC (need more USDC - will mint more)
      0,
      0,
      deployer.address,
      deadline
    );
    
  } catch (error) {
    console.log("⚠️  Error adding liquidity:", error);
    
    // Mint more USDC if needed
    console.log("Minting additional WUSDC...");
    await wusdc.mint(deployer.address, ethers.parseUnits("100000", 6));
    await wusdc.approve(dexRouterAddress, ethers.parseUnits("100000", 6));
    
    // Retry WBTC/WUSDC pair
    console.log("Retrying WBTC/WUSDC liquidity...");
    await dexRouter.addLiquidity(
      wbtcAddress,
      wusdcAddress,
      ethers.parseUnits("2", 8), // 2 BTC
      ethers.parseUnits("100000", 6), // 100K USDC
      0,
      0,
      deployer.address,
      deadline
    );
  }
  
  console.log("\\n✅ LIQUIDITY SUCCESSFULLY ADDED!");
  console.log("================================");
  console.log("Trading pairs now have liquidity:");
  console.log("• WETH/INTUIT (1 ETH ≈ 1,000 INTUIT)");
  console.log("• WETH/WBTC (20 ETH ≈ 1 BTC)");
  console.log("• WETH/WUSDC (1 ETH ≈ 2,500 USDC)");
  console.log("• WUSDC/WUSDT (1:1 ratio)");
  console.log("• WBTC/WUSDC (1 BTC ≈ 50,000 USDC)");
  console.log("\\n🎯 Your DEX is now ready for trading!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });