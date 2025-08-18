import hre from "hardhat";

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  
  console.log("🔍 Checking TTRUST balance...");
  console.log(`Deployer address: ${deployer.address}`);
  
  const balance = await deployer.getBalance();
  console.log(`TTRUST Balance: ${hre.ethers.utils.formatEther(balance)} TTRUST`);
  
  // Check if sufficient for deployment (~0.1 TTRUST should be enough)
  const requiredBalance = hre.ethers.utils.parseEther("0.1");
  
  if (balance.gte(requiredBalance)) {
    console.log("✅ Sufficient balance for deployment");
  } else {
    console.log("❌ Insufficient balance for deployment");
    console.log(`Need at least: ${hre.ethers.utils.formatEther(requiredBalance)} TTRUST`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
