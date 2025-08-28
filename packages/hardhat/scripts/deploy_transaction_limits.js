const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying Transaction Limits with account:", deployer.address);
  console.log("Account balance:", ethers.formatEther(await deployer.provider.getBalance(deployer.address)));

  // Contract addresses from previous deployment
  const contractAddresses = {
    INTUIT: "0x809d550fca64d94Bd9F66E60752A544199cfAC3D",
    DEX_ROUTER: "0x42Af1bCF6BD4876421b27c2a7Fcd9C8315cDA121",
    INTUIT_STAKING: "0xCc70E3Acd7764e8c376b11A05c47eAFf05a1e115",
    INTUIT_FAUCET: "0xb7278A61aa25c888815aFC32Ad3cC52fF24fE575"
  };

  console.log("\n🚀 Deploying TransactionLimits...");

  // Deploy TransactionLimits contract
  const TransactionLimits = await ethers.getContractFactory("TransactionLimits");
  const transactionLimits = await TransactionLimits.deploy();
  await transactionLimits.waitForDeployment();
  const transactionLimitsAddress = await transactionLimits.getAddress();

  console.log("✅ TransactionLimits deployed to:", transactionLimitsAddress);

  // Configure the limits contract with reasonable defaults
  console.log("\n⚙️ Configuring transaction limits...");
  
  // Set protocol limits: 10K max single swap, 100K daily per user, 1M daily protocol
  await transactionLimits.updateSwapLimits(
    ethers.parseEther("10000"), // 10K TRUST/INTUIT max per swap
    ethers.parseEther("100000") // 100K per user per day
  );
  
  // Set staking limits: 50K max single stake, 200K daily per user
  await transactionLimits.updateStakeLimits(
    ethers.parseEther("50000"), // 50K tokens max per stake
    ethers.parseEther("200000") // 200K per user per day
  );
  
  // Set protocol-wide daily limit to 1M tokens
  await transactionLimits.updateProtocolLimit(ethers.parseEther("1000000"));
  
  // Set suspicious activity threshold to 50K
  await transactionLimits.updateSuspiciousThreshold(ethers.parseEther("50000"));

  console.log("✅ Transaction limits configured");

  // Link TransactionLimits to existing contracts
  console.log("\n🔗 Linking TransactionLimits to existing contracts...");

  try {
    // Link to DEX Router
    const dexRouter = await ethers.getContractAt("DEXRouter", contractAddresses.DEX_ROUTER);
    await dexRouter.setTransactionLimits(transactionLimitsAddress);
    console.log("✅ DEX Router linked to TransactionLimits");
  } catch (error) {
    console.log("❌ Failed to link DEX Router:", error.message);
  }

  try {
    // Link to INTUIT Staking
    const intuitStaking = await ethers.getContractAt("IntuitStaking", contractAddresses.INTUIT_STAKING);
    await intuitStaking.setTransactionLimits(transactionLimitsAddress);
    console.log("✅ INTUIT Staking linked to TransactionLimits");
  } catch (error) {
    console.log("❌ Failed to link INTUIT Staking:", error.message);
  }

  try {
    // Link to INTUIT Faucet
    const intuitFaucet = await ethers.getContractAt("IntuitFaucet", contractAddresses.INTUIT_FAUCET);
    await intuitFaucet.setTransactionLimits(transactionLimitsAddress);
    console.log("✅ INTUIT Faucet linked to TransactionLimits");
  } catch (error) {
    console.log("❌ Failed to link INTUIT Faucet:", error.message);
  }

  console.log("\n📊 Transaction Limits Summary:");
  console.log("==========================================");
  console.log("Contract Address:", transactionLimitsAddress);
  console.log("");
  console.log("LIMITS CONFIGURATION:");
  console.log("- Max Single Swap: 10,000 tokens");
  console.log("- Max Daily Swap (per user): 100,000 tokens"); 
  console.log("- Max Single Stake: 50,000 tokens");
  console.log("- Max Daily Stake (per user): 200,000 tokens");
  console.log("- Max Daily Protocol Volume: 1,000,000 tokens");
  console.log("- Suspicious Activity Threshold: 50,000 tokens");
  console.log("- Max Faucet Claims per Day: 3");
  console.log("- Max Swaps per Block (per user): 5");
  console.log("");
  console.log("WHITELISTED USERS: Get 2x higher limits");
  console.log("FLAGGED USERS: Cannot perform transactions");
  console.log("");
  console.log("📈 Benefits:");
  console.log("- Prevents flash loan attacks");
  console.log("- Limits market manipulation");  
  console.log("- Detects suspicious activity");
  console.log("- Protects protocol from abuse");
  console.log("- Rate limiting prevents spam");

  // Test limits functionality
  console.log("\n🧪 Testing transaction limits...");
  
  try {
    const protocolLimits = await transactionLimits.getProtocolLimits();
    console.log("✅ Protocol limits check passed");
    console.log("  - Daily volume used:", ethers.formatEther(protocolLimits[0]));
    console.log("  - Daily volume limit:", ethers.formatEther(protocolLimits[1]));
    
    const userLimits = await transactionLimits.getUserLimits(deployer.address);
    console.log("✅ User limits check passed");
    console.log("  - Daily swap available:", ethers.formatEther(userLimits[1]));
    console.log("  - Daily stake available:", ethers.formatEther(userLimits[3]));
  } catch (error) {
    console.log("❌ Failed to test limits:", error.message);
  }

  console.log("\n🎉 Transaction Limits deployment complete!");
  console.log("\nNext steps:");
  console.log("1. Monitor contract for suspicious activity");
  console.log("2. Adjust limits based on usage patterns");
  console.log("3. Whitelist trusted users if needed");
  console.log("4. Implement frontend limit displays");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });