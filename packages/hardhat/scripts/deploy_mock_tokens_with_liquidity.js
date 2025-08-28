const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  
  console.log("🚀 Deploying Mock Tokens and Creating Liquidity Pools");
  console.log("Deployer:", deployer.address);
  console.log("Balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "TRUST");

  // Contract addresses (update with your deployed addresses)
  const WETH_ADDRESS = "0x575737b0990f4F9E20eA2fb047CA1cD1f314a0Fc";
  const FACTORY_ADDRESS = "0x54D248E118983dDdDF4DAA605CBa832BA6F1eb4C";
  const ROUTER_ADDRESS = "0x42Af1bCF6BD4876421b27c2a7Fcd9C8315cDA121";

  // 1. Deploy Mock Tokens
  console.log("\n📝 Step 1: Deploying Mock Tokens...");
  
  const MockBTC = await ethers.getContractFactory("MockBTC");
  const mockBTC = await MockBTC.deploy();
  await mockBTC.waitForDeployment();
  console.log("✅ MockBTC deployed:", await mockBTC.getAddress());

  const MockETH = await ethers.getContractFactory("MockETH");
  const mockETH = await MockETH.deploy();
  await mockETH.waitForDeployment();
  console.log("✅ MockETH deployed:", await mockETH.getAddress());

  const MockUSDC = await ethers.getContractFactory("MockUSDC");
  const mockUSDC = await MockUSDC.deploy();
  await mockUSDC.waitForDeployment();
  console.log("✅ MockUSDC deployed:", await mockUSDC.getAddress());

  const MockUSDT = await ethers.getContractFactory("MockUSDT");
  const mockUSDT = await MockUSDT.deploy();
  await mockUSDT.waitForDeployment();
  console.log("✅ MockUSDT deployed:", await mockUSDT.getAddress());

  // 2. Get contracts
  const factory = await ethers.getContractAt("DEXFactory", FACTORY_ADDRESS);
  const router = await ethers.getContractAt("DEXRouter", ROUTER_ADDRESS);

  // 3. Create pairs
  console.log("\n🔗 Step 2: Creating Trading Pairs...");
  
  const pairs = [
    { name: "BTC/WETH", token: mockBTC },
    { name: "ETH/WETH", token: mockETH },
    { name: "USDC/WETH", token: mockUSDC },
    { name: "USDT/WETH", token: mockUSDT }
  ];

  for (const pair of pairs) {
    console.log(`Creating ${pair.name} pair...`);
    const tx = await factory.createPair(await pair.token.getAddress(), WETH_ADDRESS);
    await tx.wait();
    const pairAddress = await factory.getPair(await pair.token.getAddress(), WETH_ADDRESS);
    console.log(`✅ ${pair.name} pair created:`, pairAddress);
  }

  // 4. Add liquidity to each pair
  console.log("\n💧 Step 3: Adding Liquidity to Pairs...");
  
  const liquidityAmounts = [
    { 
      token: mockBTC, 
      name: "BTC", 
      tokenAmount: ethers.parseUnits("1", 8), // 1 BTC
      trustAmount: ethers.parseEther("50000") // 50,000 TRUST (1 BTC = 50k TRUST)
    },
    { 
      token: mockETH, 
      name: "ETH", 
      tokenAmount: ethers.parseEther("10"), // 10 ETH
      trustAmount: ethers.parseEther("30000") // 30,000 TRUST (1 ETH = 3k TRUST)
    },
    { 
      token: mockUSDC, 
      name: "USDC", 
      tokenAmount: ethers.parseUnits("100000", 6), // 100k USDC
      trustAmount: ethers.parseEther("100000") // 100,000 TRUST (1 TRUST = 1 USDC)
    },
    { 
      token: mockUSDT, 
      name: "USDT", 
      tokenAmount: ethers.parseUnits("100000", 6), // 100k USDT
      trustAmount: ethers.parseEther("100000") // 100,000 TRUST (1 TRUST = 1 USDT)
    }
  ];

  for (const liquidity of liquidityAmounts) {
    console.log(`\nAdding liquidity to ${liquidity.name}/TRUST pool...`);
    console.log(`Token Amount: ${ethers.formatUnits(liquidity.tokenAmount, await liquidity.token.decimals())} ${liquidity.name}`);
    console.log(`TRUST Amount: ${ethers.formatEther(liquidity.trustAmount)} TRUST`);
    
    // Approve router to spend tokens
    const approveTx = await liquidity.token.approve(ROUTER_ADDRESS, liquidity.tokenAmount);
    await approveTx.wait();
    console.log(`✅ Approved ${liquidity.name} spending`);
    
    // Add liquidity
    const deadline = Math.floor(Date.now() / 1000) + 1200; // 20 minutes
    const addLiquidityTx = await router.addLiquidityETH(
      await liquidity.token.getAddress(),
      liquidity.tokenAmount,
      0, // amountTokenMin
      0, // amountETHMin  
      deployer.address, // to
      deadline,
      { value: liquidity.trustAmount }
    );
    
    await addLiquidityTx.wait();
    console.log(`✅ ${liquidity.name}/TRUST liquidity added successfully!`);
  }

  // 5. Display final addresses for frontend
  console.log("\n🎯 DEPLOYMENT COMPLETE! Update your frontend with these addresses:");
  console.log("=================================================================");
  console.log(`MockBTC: ${await mockBTC.getAddress()}`);
  console.log(`MockETH: ${await mockETH.getAddress()}`);
  console.log(`MockUSDC: ${await mockUSDC.getAddress()}`);
  console.log(`MockUSDT: ${await mockUSDT.getAddress()}`);
  
  console.log("\n📊 Liquidity Pools Created:");
  console.log("- BTC/TRUST: 1 BTC ↔ 50,000 TRUST");
  console.log("- ETH/TRUST: 10 ETH ↔ 30,000 TRUST"); 
  console.log("- USDC/TRUST: 100k USDC ↔ 100k TRUST");
  console.log("- USDT/TRUST: 100k USDT ↔ 100k TRUST");
  
  console.log("\n✅ Ready for testing swaps!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });