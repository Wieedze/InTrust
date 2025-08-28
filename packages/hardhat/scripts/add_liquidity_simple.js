const { ethers } = require("hardhat");

async function main() {
  console.log("\n🏊 Adding simple liquidity to TRUST/INTUIT pool");
  
  // Use deployed addresses
  const INTUIT_ADDRESS = "0x809d550fca64d94Bd9F66E60752A544199cfAC3D";
  const DEX_ROUTER = "0x5f3f1dBD7B74C6B46e8c44f98792A1dAf8d69154";
  
  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);
  
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("TRUST Balance:", ethers.formatEther(balance), "TRUST");
  
  // Connect to contracts
  const IntuitToken = await ethers.getContractFactory("Intuit");
  const intuitToken = await IntuitToken.attach(INTUIT_ADDRESS);
  
  const DEXRouter = await ethers.getContractFactory("DEXRouter");
  const router = await DEXRouter.attach(DEX_ROUTER);
  
  // Check INTUIT balance
  const intuitBalance = await intuitToken.balanceOf(deployer.address);
  console.log("INTUIT Balance:", ethers.formatEther(intuitBalance), "INTUIT");
  
  if (intuitBalance < ethers.parseEther("1000")) {
    console.log("❌ Not enough INTUIT tokens for liquidity");
    return;
  }
  
  // Use smaller amounts for liquidity
  const trustAmount = ethers.parseEther("0.01"); // 0.01 TRUST
  const intuitAmountForLiquidity = ethers.parseEther("100"); // 100 INTUIT
  
  console.log("\n🏊 Adding liquidity:");
  console.log(`- ${ethers.formatEther(trustAmount)} TRUST`);
  console.log(`- ${ethers.formatEther(intuitAmountForLiquidity)} INTUIT`);
  
  // Approve INTUIT for router
  console.log("\n✅ Approving INTUIT...");
  const approveRouterTx = await intuitToken.approve(DEX_ROUTER, intuitAmountForLiquidity);
  await approveRouterTx.wait();
  
  // Add liquidity
  console.log("✅ Adding liquidity...");
  const deadline = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
  
  const addLiquidityTx = await router.addLiquidityETH(
    INTUIT_ADDRESS,                 // INTUIT token
    intuitAmountForLiquidity,       // INTUIT amount
    intuitAmountForLiquidity,       // min INTUIT (same for initial)
    trustAmount,                    // min TRUST
    deployer.address,               // LP tokens to
    deadline,                       // deadline
    { value: trustAmount }          // TRUST amount (as ETH value)
  );
  await addLiquidityTx.wait();
  
  console.log("✅ Liquidity pool created successfully!");
  console.log(`Rate: 1 TRUST = ${ethers.formatEther(intuitAmountForLiquidity) / ethers.formatEther(trustAmount)} INTUIT`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });