import hre from "hardhat";

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  
  // Contract addresses
  const intuitTokenAddress = "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9";
  const dexAddress = "0x5FC8d32690cc91D4c39d9d3abcBD16989F875707";
  
  console.log("🚀 Initializing DEX with Available Liquidity");
  console.log("============================================");
  console.log(`Deployer: ${deployer.address}`);
  console.log(`DEX: ${dexAddress}`);
  
  // Get contract instances
  const intuitContract = await hre.ethers.getContractAt("Intuit", intuitTokenAddress);
  const dexContract = await hre.ethers.getContractAt("IntuitDEX", dexAddress);
  
  // Check current balances
  const deployerBalance = await intuitContract.balanceOf(deployer.address);
  const ttrustBalance = await deployer.provider.getBalance(deployer.address);
  
  console.log(`\n💰 Current Balances:`);
  console.log(`TTRUST: ${hre.ethers.formatEther(ttrustBalance)}`);
  console.log(`INTUIT: ${hre.ethers.formatEther(deployerBalance)}`);
  
  // Use available TTRUST (minus gas reserves)
  const gasReserve = hre.ethers.parseEther("0.1"); // Keep 0.1 TTRUST for gas
  const availableTtrust = ttrustBalance - gasReserve;
  
  if (availableTtrust <= 0) {
    console.log("❌ No TTRUST available for liquidity (need gas reserves)");
    return;
  }
  
  // Use proportional INTUIT amount (start with smaller amount for testing)
  const ttrustForLiquidity = availableTtrust > hre.ethers.parseEther("10") 
    ? hre.ethers.parseEther("5") // Use 5 TTRUST if we have more than 10
    : availableTtrust; // Use all available if less than 10
    
  const intuitForLiquidity = hre.ethers.parseEther("5000"); // 5000 INTUIT tokens
  
  console.log(`\n📊 Liquidity to Add:`);
  console.log(`TTRUST: ${hre.ethers.formatEther(ttrustForLiquidity)}`);
  console.log(`INTUIT: ${hre.ethers.formatEther(intuitForLiquidity)}`);
  
  // Check if we have enough INTUIT
  if (deployerBalance < intuitForLiquidity) {
    console.log("❌ Insufficient INTUIT balance");
    return;
  }
  
  // Step 1: Approve DEX to spend INTUIT tokens
  console.log("\n📝 Step 1: Approving INTUIT spending...");
  const approveTx = await intuitContract.approve(dexAddress, intuitForLiquidity);
  await approveTx.wait();
  console.log("✅ INTUIT spending approved");
  
  // Step 2: Initialize DEX
  console.log("\n🔄 Step 2: Initializing DEX...");
  const initTx = await dexContract.init(intuitForLiquidity, {
    value: ttrustForLiquidity
  });
  
  console.log(`Transaction hash: ${initTx.hash}`);
  await initTx.wait();
  console.log("✅ DEX initialized successfully!");
  
  // Step 3: Verify liquidity
  const [ttrustReserve, intuitReserve] = await dexContract.getReserves();
  const totalLiquidity = await dexContract.totalLiquidity();
  
  console.log("\n📊 DEX Status:");
  console.log(`TTRUST Reserve: ${hre.ethers.formatEther(ttrustReserve)}`);
  console.log(`INTUIT Reserve: ${hre.ethers.formatEther(intuitReserve)}`);
  console.log(`Total Liquidity: ${totalLiquidity.toString()}`);
  console.log(`Exchange Rate: 1 TTRUST = ${(Number(hre.ethers.formatEther(intuitReserve)) / Number(hre.ethers.formatEther(ttrustReserve))).toFixed(4)} INTUIT`);
  
  console.log("\n🎉 DEX is now ready for trading!");
  console.log("Users can now swap TTRUST ↔ INTUIT");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
