const hre = require("hardhat");

async function main() {
  try {
    // Get the deployed INTUIT contract
    const intuit = await hre.ethers.getContract("Intuit");
    const intuitAddress = await intuit.getAddress();
    
    console.log("INTUIT Token Address:", intuitAddress);
    
    // Check basic token info
    const name = await intuit.name();
    const symbol = await intuit.symbol();
    const decimals = await intuit.decimals();
    const totalSupply = await intuit.totalSupply();
    
    console.log("Token Name:", name);
    console.log("Token Symbol:", symbol);
    console.log("Decimals:", decimals.toString());
    console.log("Total Supply:", hre.ethers.formatEther(totalSupply), "INTUIT");
    
    // Check deployer balance
    const [deployer] = await hre.ethers.getSigners();
    const deployerBalance = await intuit.balanceOf(deployer.address);
    console.log("Deployer Balance:", hre.ethers.formatEther(deployerBalance), "INTUIT");
    
    // Check DEX contract
    const dex = await hre.ethers.getContract("DEX");
    const dexAddress = await dex.getAddress();
    const dexBalance = await intuit.balanceOf(dexAddress);
    console.log("DEX Balance:", hre.ethers.formatEther(dexBalance), "INTUIT");
    
    console.log("✅ INTUIT token is real and deployed!");
    
  } catch (error) {
    console.error("❌ Error verifying INTUIT token:", error.message);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
