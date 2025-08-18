import { ethers } from "hardhat";

async function main() {
  console.log("🔍 Debugging Balance Issues");
  console.log("============================");

  const [deployer] = await ethers.getSigners();
  const userAddress = "0xd7512902999b34af2B2940Eb8827CC8345DC77C6";
  
  // Contract addresses
  const intuitAddress = "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9";
  const dexAddress = "0x5FC8d32690cc91D4c39d9d3abcBD16989F875707";
  
  console.log("📍 Contract Addresses:");
  console.log("INTUIT Token:", intuitAddress);
  console.log("IntuitDEX:", dexAddress);
  console.log("User Address:", userAddress);
  console.log("");

  // Get contracts
  const Intuit = await ethers.getContractFactory("Intuit");
  const intuit = Intuit.attach(intuitAddress) as any;
  
  const IntuitDEX = await ethers.getContractFactory("IntuitDEX");
  const dex = IntuitDEX.attach(dexAddress) as any;

  try {
    // Check INTUIT token info
    console.log("🪙 INTUIT Token Info:");
    const name = await intuit.name();
    const symbol = await intuit.symbol();
    const totalSupply = await intuit.totalSupply();
    const decimals = await intuit.decimals();
    console.log("Name:", name);
    console.log("Symbol:", symbol);
    console.log("Total Supply:", ethers.formatEther(totalSupply));
    console.log("Decimals:", decimals);
    console.log("");

    // Check user INTUIT balance
    console.log("👤 User INTUIT Balance:");
    const userBalance = await intuit.balanceOf(userAddress);
    console.log("Raw balance:", userBalance.toString());
    console.log("Formatted balance:", ethers.formatEther(userBalance), "INTUIT");
    console.log("");

    // Check deployer INTUIT balance
    console.log("🚀 Deployer INTUIT Balance:");
    const deployerBalance = await intuit.balanceOf(deployer.address);
    console.log("Raw balance:", deployerBalance.toString());
    console.log("Formatted balance:", ethers.formatEther(deployerBalance), "INTUIT");
    console.log("");

    // Check DEX INTUIT balance
    console.log("🏦 DEX INTUIT Balance:");
    const dexIntuitBalance = await intuit.balanceOf(dexAddress);
    console.log("Raw balance:", dexIntuitBalance.toString());
    console.log("Formatted balance:", ethers.formatEther(dexIntuitBalance), "INTUIT");
    console.log("");

    // Check DEX TTRUST balance
    console.log("🏦 DEX TTRUST Balance:");
    const dexTtrustBalance = await ethers.provider.getBalance(dexAddress);
    console.log("Raw balance:", dexTtrustBalance.toString());
    console.log("Formatted balance:", ethers.formatEther(dexTtrustBalance), "TTRUST");
    console.log("");

    // Check DEX reserves
    console.log("📊 DEX Reserves:");
    try {
      const reserves = await dex.getReserves();
      console.log("TTRUST Reserve:", ethers.formatEther(reserves[0]));
      console.log("INTUIT Reserve:", ethers.formatEther(reserves[1]));
    } catch (error: any) {
      console.log("❌ Error getting reserves:", error.message);
    }
    console.log("");

    // Check if DEX has liquidity
    if (dexTtrustBalance > 0n && dexIntuitBalance > 0n) {
      console.log("✅ DEX has liquidity!");
    } else {
      console.log("❌ DEX has no liquidity");
      console.log("TTRUST in DEX:", ethers.formatEther(dexTtrustBalance));
      console.log("INTUIT in DEX:", ethers.formatEther(dexIntuitBalance));
    }

  } catch (error: any) {
    console.error("❌ Error:", error);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
