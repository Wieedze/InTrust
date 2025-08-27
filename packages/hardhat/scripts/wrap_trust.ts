import { ethers } from "hardhat";

async function main() {
  console.log("🔄 Wrapping TRUST to WTRUST...");

  const [deployer] = await ethers.getSigners();
  console.log("👤 Account:", deployer.address);

  // Check TRUST balance
  const trustBalance = await ethers.provider.getBalance(deployer.address);
  console.log(`💰 TRUST Balance: ${ethers.formatEther(trustBalance)} TRUST`);

  // Get WTRUST contract
  const wtrust = await ethers.getContract("WTRUST");
  console.log("📍 WTRUST Contract:", await wtrust.getAddress());

  // Amount to wrap (keep some for gas)
  const amountToWrap = ethers.parseEther("1000"); // Wrap 1000 TRUST
  
  if (trustBalance < amountToWrap) {
    console.log("❌ Insufficient TRUST balance");
    return;
  }

  try {
    console.log(`🔄 Wrapping ${ethers.formatEther(amountToWrap)} TRUST...`);
    
    // Send TRUST to WTRUST contract to wrap it
    const tx = await deployer.sendTransaction({
      to: await wtrust.getAddress(),
      value: amountToWrap,
      gasLimit: 100000
    });
    
    console.log("⏳ Transaction sent:", tx.hash);
    await tx.wait();
    
    // Check WTRUST balance after wrapping
    const wtrustBalance = await wtrust.balanceOf(deployer.address);
    console.log(`✅ Wrapped successfully!`);
    console.log(`💎 WTRUST Balance: ${ethers.formatEther(wtrustBalance)} WTRUST`);
    
    // Updated TRUST balance
    const newTrustBalance = await ethers.provider.getBalance(deployer.address);
    console.log(`💰 Remaining TRUST: ${ethers.formatEther(newTrustBalance)} TRUST`);
    
  } catch (error) {
    console.error("❌ Error wrapping TRUST:", error);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });