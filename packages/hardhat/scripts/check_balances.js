const { ethers } = require("hardhat");

async function main() {
  console.log("🔍 Checking INTUIT balances...");
  
  const INTUIT_ADDRESS = "0xe8bD8876CB6f97663c668faae65C4Da579FfA0B5";
  
  const [deployer] = await ethers.getSigners();
  console.log("Current signer:", deployer.address);
  
  // Connect to INTUIT contract
  const IntuitToken = await ethers.getContractFactory("Intuit");
  const intuitToken = await IntuitToken.attach(INTUIT_ADDRESS);
  
  // Check total supply
  const totalSupply = await intuitToken.totalSupply();
  console.log(`Total INTUIT supply: ${ethers.formatEther(totalSupply)}`);
  
  // Check deployer balance
  const deployerBalance = await intuitToken.balanceOf(deployer.address);
  console.log(`Your balance: ${ethers.formatEther(deployerBalance)} INTUIT`);
  
  // Check if this is the token holder
  if (deployerBalance > 0) {
    console.log("✅ You have INTUIT tokens!");
  } else {
    console.log("❌ No INTUIT tokens in this wallet");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });