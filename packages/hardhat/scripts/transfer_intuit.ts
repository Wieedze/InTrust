import hre from "hardhat";

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  
  // Contract addresses
  const intuitTokenAddress = "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9";
  const recipientAddress = "0xd7512902999b34af2B2940Eb8827CC8345DC77C6";
  const transferAmount = hre.ethers.parseEther("5000"); // 5000 INTUIT tokens
  
  console.log("💰 Transferring INTUIT Tokens");
  console.log("=============================");
  console.log(`From: ${deployer.address}`);
  console.log(`To: ${recipientAddress}`);
  console.log(`Amount: ${hre.ethers.formatEther(transferAmount)} INTUIT`);
  
  // Get contract instance
  const intuitContract = await hre.ethers.getContractAt("Intuit", intuitTokenAddress);
  
  // Check deployer balance
  const deployerBalance = await intuitContract.balanceOf(deployer.address);
  console.log(`\nDeployer Balance: ${hre.ethers.formatEther(deployerBalance)} INTUIT`);
  
  if (deployerBalance < transferAmount) {
    console.log("❌ Insufficient balance for transfer");
    return;
  }
  
  // Perform transfer
  console.log("\n📤 Executing transfer...");
  const transferTx = await intuitContract.transfer(recipientAddress, transferAmount);
  console.log(`Transaction hash: ${transferTx.hash}`);
  
  // Wait for confirmation
  await transferTx.wait();
  console.log("✅ Transfer confirmed!");
  
  // Verify balances
  const newDeployerBalance = await intuitContract.balanceOf(deployer.address);
  const recipientBalance = await intuitContract.balanceOf(recipientAddress);
  
  console.log("\n📊 Final Balances:");
  console.log(`Deployer: ${hre.ethers.formatEther(newDeployerBalance)} INTUIT`);
  console.log(`Recipient: ${hre.ethers.formatEther(recipientBalance)} INTUIT`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
