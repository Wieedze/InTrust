const { ethers } = require("hardhat");

async function main() {
  console.log("🔄 Transferring INTUIT tokens...");
  
  // INTUIT contract address (update with your deployed address)
  const INTUIT_ADDRESS = "0xe8bD8876CB6f97663c668faae65C4Da579FfA0B5";
  
  // Your wallet address (replace with your actual wallet address)
  const YOUR_WALLET = "YOUR_WALLET_ADDRESS_HERE"; // ⚠️ Replace this!
  
  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);
  
  // Connect to INTUIT contract
  const IntuitToken = await ethers.getContractFactory("Intuit");
  const intuitToken = await IntuitToken.attach(INTUIT_ADDRESS);
  
  // Check deployer balance
  const deployerBalance = await intuitToken.balanceOf(deployer.address);
  console.log(`Deployer INTUIT balance: ${ethers.formatEther(deployerBalance)}`);
  
  // Transfer amount (e.g., 10,000 INTUIT for testing)
  const transferAmount = ethers.parseEther("10000");
  
  console.log(`\n💸 Transferring ${ethers.formatEther(transferAmount)} INTUIT to ${YOUR_WALLET}...`);
  
  const tx = await intuitToken.transfer(YOUR_WALLET, transferAmount);
  await tx.wait();
  
  console.log("✅ Transfer completed!");
  
  // Check balances after transfer
  const newDeployerBalance = await intuitToken.balanceOf(deployer.address);
  const yourBalance = await intuitToken.balanceOf(YOUR_WALLET);
  
  console.log("\n📊 Final balances:");
  console.log(`Deployer: ${ethers.formatEther(newDeployerBalance)} INTUIT`);
  console.log(`Your wallet: ${ethers.formatEther(yourBalance)} INTUIT`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });