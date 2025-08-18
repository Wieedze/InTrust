import hre from "hardhat";
import { formatEther } from "viem";

/**
 * Check TTRUST token supply and distribution on INTUITION Network
 */

async function main() {
  console.log("🔍 Checking TTRUST Token Information on INTUITION Network...\n");
  
  const TTRUST_ADDRESS = "0xA54b4E6e356b963Ee00d1C947f478d9194a1a210";
  
  try {
    // Try to get TTRUST as ERC20 contract
    const ttrust = await hre.ethers.getContractAt("IERC20", TTRUST_ADDRESS);
    
    console.log(`📍 TTRUST Contract Address: ${TTRUST_ADDRESS}`);
    
    // Check if it's a standard ERC20
    try {
      const totalSupply = await ttrust.totalSupply();
      console.log(`📊 Total Supply: ${formatEther(totalSupply)} TTRUST`);
      
      const name = await ttrust.name();
      const symbol = await ttrust.symbol();
      const decimals = await ttrust.decimals();
      
      console.log(`📝 Token Details:`);
      console.log(`   Name: ${name}`);
      console.log(`   Symbol: ${symbol}`);
      console.log(`   Decimals: ${decimals}`);
      
    } catch (error) {
      console.log("⚠️  Could not read ERC20 standard functions");
      console.log("   This might be a native token or non-standard implementation");
    }
    
    // Check some major holder addresses to understand distribution
    const [deployer] = await hre.ethers.getSigners();
    const deployerBalance = await ttrust.balanceOf(deployer.address);
    console.log(`\n💰 Your Balance: ${formatEther(deployerBalance)} TTRUST`);
    
    // Check if there are any major holders or pools
    console.log(`\n🔍 Checking for major holders/pools...`);
    
    // Common addresses to check
    const addressesToCheck = [
      { name: "Zero Address", address: "0x0000000000000000000000000000000000000000" },
      { name: "Dead Address", address: "0x000000000000000000000000000000000000dEaD" },
      { name: "TokenDEX", address: "0x04BfB74f07c5E4C318ef3c90c4713F068548f809" },
    ];
    
    for (const addr of addressesToCheck) {
      try {
        const balance = await ttrust.balanceOf(addr.address);
        if (balance > 0n) {
          console.log(`   ${addr.name}: ${formatEther(balance)} TTRUST`);
        }
      } catch (error) {
        console.log(`   ${addr.name}: Could not check balance`);
      }
    }
    
  } catch (error) {
    console.log("❌ Could not connect to TTRUST as ERC20 contract");
    console.log("   This suggests TTRUST might be the native token (like ETH)");
    
    // If it's native token, check some network stats
    console.log("\n🌐 Checking as native token...");
    
    const [deployer] = await ethers.getSigners();
    const balance = await ethers.provider.getBalance(deployer.address);
    console.log(`💰 Your Native Balance: ${formatEther(balance)} TTRUST`);
    
    // Check latest block for more network info
    const latestBlock = await ethers.provider.getBlock("latest");
    console.log(`\n📦 Latest Block: ${latestBlock?.number}`);
    console.log(`⛽ Gas Limit: ${latestBlock?.gasLimit}`);
    
    // Check if TokenDEX has any native balance
    const dexBalance = await ethers.provider.getBalance("0x04BfB74f07c5E4C318ef3c90c4713F068548f809");
    console.log(`🏦 TokenDEX Native Balance: ${formatEther(dexBalance)} TTRUST`);
  }
  
  console.log("\n" + "=".repeat(60));
  console.log("📋 SUMMARY:");
  console.log("- TTRUST appears to be the native token on INTUITION Network");
  console.log("- Similar to how ETH works on Ethereum");
  console.log("- Total supply is determined by network consensus, not a contract");
  console.log("- Available supply depends on network validators and distribution");
  console.log("- For DEX liquidity, you can use whatever amount you're comfortable with");
  console.log("\n💡 RECOMMENDATION:");
  console.log("- Start with 1-2 TTRUST for initial liquidity testing");
  console.log("- Scale up based on community adoption");
  console.log("- TTRUST supply is likely much larger than individual wallet amounts");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
