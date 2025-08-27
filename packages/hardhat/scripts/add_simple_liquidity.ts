import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  
  console.log("🌍 ADDING LIQUIDITY TO DEX PAIRS");
  console.log("================================");
  console.log(`Deployer: ${deployer.address}`);
  
  // Contract addresses
  const dexRouterAddress = "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9";
  
  // Token addresses  
  const intuitAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
  const wbtcAddress = "0xA51c1fc2f0D1a1b8494Ed1FE312d7C3a78Ed91C0";
  const wusdcAddress = "0x0DCd1Bf9A1b36cE34237eEaFef220932846BCD82";
  const wusdtAddress = "0x9A676e781A523b5d0C0e43731313A708CB607508";
  
  // Get contracts
  const dexRouter = await ethers.getContractAt("DEXRouter", dexRouterAddress);
  
  // ERC20 ABI for tokens with mint function
  const erc20Abi = [
    "function mint(address to, uint256 amount) external",
    "function approve(address spender, uint256 amount) external returns (bool)",
    "function balanceOf(address owner) external view returns (uint256)",
    "function transfer(address to, uint256 amount) external returns (bool)"
  ];
  
  console.log("\\n💰 MINTING TOKENS FOR LIQUIDITY");
  console.log("===============================");
  
  // Get token contracts (only the ones with mint functions)
  const intuit = await ethers.getContractAt("Intuit", intuitAddress);
  const wbtc = await ethers.getContractAt(erc20Abi, wbtcAddress);
  const wusdc = await ethers.getContractAt(erc20Abi, wusdcAddress);
  const wusdt = await ethers.getContractAt(erc20Abi, wusdtAddress);
  
  // Mint amounts (adjusted for decimals)
  const intuitAmount = ethers.parseEther("50000"); // 50K INTUIT
  const btcAmount = ethers.parseUnits("5", 8); // 5 BTC (8 decimals)
  const usdcAmount = ethers.parseUnits("100000", 6); // 100K USDC (6 decimals)  
  const usdtAmount = ethers.parseUnits("100000", 6); // 100K USDT (6 decimals)
  
  // Check current balances
  console.log("Checking INTUIT balance...");
  const intuitBalance = await intuit.balanceOf(deployer.address);
  console.log(`Current INTUIT balance: ${ethers.formatEther(intuitBalance)}`);
  
  console.log("Minting WBTC...");
  await wbtc.mint(deployer.address, btcAmount);
  
  console.log("Minting WUSDC...");
  await wusdc.mint(deployer.address, usdcAmount);
  
  console.log("Minting WUSDT...");
  await wusdt.mint(deployer.address, usdtAmount);
  
  console.log("\\n🔐 APPROVING TOKENS");
  console.log("==================");
  
  const deadline = Math.floor(Date.now() / 1000) + 1200; // 20 minutes
  
  // Approve DEXRouter to spend tokens
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
  
  try {
    // 1. INTUIT/WBTC pair (10,000 INTUIT = 1 BTC)
    console.log("Adding INTUIT/WBTC liquidity...");
    await dexRouter.addLiquidity(
      intuitAddress,
      wbtcAddress,
      ethers.parseEther("10000"), // 10K INTUIT
      ethers.parseUnits("1", 8), // 1 BTC
      0,
      0,
      deployer.address,
      deadline
    );
    
    // 2. INTUIT/WUSDC pair (1 INTUIT = 0.05 USDC)
    console.log("Adding INTUIT/WUSDC liquidity...");
    await dexRouter.addLiquidity(
      intuitAddress,
      wusdcAddress,
      ethers.parseEther("20000"), // 20K INTUIT
      ethers.parseUnits("1000", 6), // 1K USDC
      0,
      0,
      deployer.address,
      deadline
    );
    
    // 3. WUSDC/WUSDT pair (1:1 ratio)
    console.log("Adding WUSDC/WUSDT liquidity...");
    await dexRouter.addLiquidity(
      wusdcAddress,
      wusdtAddress,
      ethers.parseUnits("10000", 6), // 10K USDC
      ethers.parseUnits("10000", 6), // 10K USDT
      0,
      0,
      deployer.address,
      deadline
    );
    
    // 4. WBTC/WUSDC pair (1 BTC = 50,000 USDC)
    console.log("Adding WBTC/WUSDC liquidity...");
    await dexRouter.addLiquidity(
      wbtcAddress,
      wusdcAddress,
      ethers.parseUnits("1", 8), // 1 BTC
      ethers.parseUnits("50000", 6), // 50K USDC
      0,
      0,
      deployer.address,
      deadline
    );
    
    console.log("\\n✅ LIQUIDITY SUCCESSFULLY ADDED!");
    console.log("================================");
    console.log("Trading pairs now have liquidity:");
    console.log("• INTUIT/WBTC (10,000 INTUIT ≈ 1 BTC)");
    console.log("• INTUIT/WUSDC (20 INTUIT ≈ 1 USDC)");
    console.log("• WUSDC/WUSDT (1:1 ratio)");
    console.log("• WBTC/WUSDC (1 BTC ≈ 50,000 USDC)");
    console.log("\\n🎯 Your DEX now has basic liquidity for trading!");
    
  } catch (error) {
    console.log("⚠️  Error adding liquidity:", error);
    console.log("\\n🔍 TROUBLESHOOTING:");
    console.log("- Make sure hardhat node is running");
    console.log("- Check that all contracts are deployed");
    console.log("- Verify token addresses are correct");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });