import hre from "hardhat";

async function main() {
  console.log("🔍 CHECKING DEPLOYMENT READINESS FOR 1000 TTRUST DEX");
  console.log("===================================================");

  const [deployer] = await hre.ethers.getSigners();
  
  console.log(`\n📍 Deployer Wallet Address:`);
  console.log(`${deployer.address}`);
  console.log(`\n👆 Send 1000 TTRUST to this address ☝️`);
  
  // Check current TTRUST balance
  const currentBalance = await hre.ethers.provider.getBalance(deployer.address);
  console.log(`\n💰 Current TTRUST Balance:`);
  console.log(`${hre.ethers.formatEther(currentBalance)} TTRUST`);
  
  // Requirements for deployment
  const requiredTtrust = hre.ethers.parseEther("1000"); // 1000 TTRUST for DEX
  const gasReserve = hre.ethers.parseEther("10");       // 10 TTRUST for gas
  const totalNeeded = requiredTtrust + gasReserve;      // 1010 TTRUST total
  
  console.log(`\n📋 Deployment Requirements:`);
  console.log(`- DEX Liquidity: ${hre.ethers.formatEther(requiredTtrust)} TTRUST`);
  console.log(`- Gas Reserve: ${hre.ethers.formatEther(gasReserve)} TTRUST`);
  console.log(`- Total Needed: ${hre.ethers.formatEther(totalNeeded)} TTRUST`);
  
  // Check if ready
  const shortfall = totalNeeded - currentBalance;
  
  if (currentBalance >= totalNeeded) {
    console.log(`\n✅ READY TO DEPLOY!`);
    console.log(`You have sufficient TTRUST for deployment.`);
    console.log(`\n🚀 Run deployment with:`);
    console.log(`yarn hardhat deploy --network intuition --tags IntuitNoVesting`);
  } else {
    console.log(`\n❌ NOT READY - Need more TTRUST`);
    console.log(`Shortfall: ${hre.ethers.formatEther(shortfall)} TTRUST`);
    console.log(`\n📤 Send ${hre.ethers.formatEther(shortfall)} TTRUST to:`);
    console.log(`${deployer.address}`);
  }
  
  // Show network info
  const network = await hre.ethers.provider.getNetwork();
  console.log(`\n🌐 Network Info:`);
  console.log(`Network: ${network.name} (Chain ID: ${network.chainId})`);
  
  // Get latest block for network health
  const latestBlock = await hre.ethers.provider.getBlock("latest");
  console.log(`Latest Block: ${latestBlock?.number}`);
  console.log(`Block Timestamp: ${latestBlock ? new Date(latestBlock.timestamp * 1000).toLocaleString() : 'Unknown'}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
