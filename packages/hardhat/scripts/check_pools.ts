import { ethers } from "hardhat";

async function main() {
  console.log("🔍 Checking UniversalStaking pools...");

  const universalStaking = await ethers.getContract("UniversalStaking");
  console.log("📍 UniversalStaking at:", await universalStaking.getAddress());

  // List of token addresses to check
  const tokens = [
    { name: "TRUST", address: "0xA54b4E6e356b963Ee00d1C947f478d9194a1a210" },
    { name: "INTUIT", address: "0x5FbDB2315678afecb367f032d93F642f64180aa3" },
    { name: "WBTC", address: "0xB7f8BC63BbcaD18155201308C8f3540b07f84F5e" },
    { name: "WETH", address: "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512" },
    { name: "WUSDC", address: "0xA51c1fc2f0D1a1b8494Ed1FE312d7C3a78Ed91C0" },
    { name: "WUSDT", address: "0x0DCd1Bf9A1b36cE34237eEaFef220932846BCD82" }
  ];

  console.log("\n📊 Pool Information:");
  for (const token of tokens) {
    try {
      const poolInfo = await universalStaking.getPoolInfo(token.address);
      const [rewardRate, totalStaked, minStakeAmount, lockPeriod, isActive] = poolInfo;
      
      console.log(`\n🔹 ${token.name} (${token.address}):`);
      console.log(`   ✅ Active: ${isActive}`);
      console.log(`   💰 Reward Rate: ${ethers.formatEther(rewardRate)} per second`);
      console.log(`   📊 Total Staked: ${ethers.formatEther(totalStaked)}`);
      console.log(`   🔒 Min Stake: ${ethers.formatEther(minStakeAmount)}`);
      console.log(`   ⏰ Lock Period: ${lockPeriod} seconds`);
      
    } catch (error) {
      console.log(`\n❌ ${token.name}: Pool not found or inactive`);
    }
  }

  // Get supported tokens
  try {
    const supportedTokens = await universalStaking.getSupportedTokens();
    console.log("\n🎯 Supported tokens:", supportedTokens.length);
    for (let i = 0; i < supportedTokens.length; i++) {
      console.log(`   ${i + 1}. ${supportedTokens[i]}`);
    }
  } catch (error) {
    console.log("❌ Error getting supported tokens:", error);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });