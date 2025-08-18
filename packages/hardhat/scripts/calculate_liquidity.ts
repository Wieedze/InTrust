import { parseEther, formatEther } from "viem";

/**
 * Calculate optimal liquidity allocation for TTRUST/INTUIT DEX
 * 
 * This script helps you determine the right amounts based on:
 * 1. Desired exchange rate
 * 2. Available TTRUST balance
 * 3. INTUIT allocation percentage
 */

interface LiquidityConfig {
  exchangeRate: number;        // 1 TTRUST = X INTUIT
  intuitAllocationPercent: number; // % of total INTUIT supply for DEX
  availableTtrust: number;     // Available TTRUST for liquidity
}

const INTUIT_TOTAL_SUPPLY = 1_000_000; // 1M INTUIT tokens

function calculateLiquidity(config: LiquidityConfig) {
  const { exchangeRate, intuitAllocationPercent, availableTtrust } = config;
  
  console.log(`\n🧮 Liquidity Calculation`);
  console.log(`Exchange Rate: 1 TTRUST = ${exchangeRate} INTUIT`);
  console.log(`INTUIT Allocation: ${intuitAllocationPercent}% of total supply`);
  console.log(`Available TTRUST: ${availableTtrust.toLocaleString()} TTRUST`);
  
  // Calculate INTUIT allocation
  const intuitForDex = INTUIT_TOTAL_SUPPLY * (intuitAllocationPercent / 100);
  
  // Calculate required TTRUST for this INTUIT amount
  const requiredTtrust = intuitForDex / exchangeRate;
  
  console.log(`\n📊 Results:`);
  console.log(`INTUIT for DEX: ${intuitForDex.toLocaleString()} INTUIT`);
  console.log(`Required TTRUST: ${requiredTtrust.toLocaleString()} TTRUST`);
  
  if (requiredTtrust > availableTtrust) {
    console.log(`\n⚠️  Insufficient TTRUST!`);
    console.log(`Need: ${requiredTtrust.toLocaleString()}, Have: ${availableTtrust.toLocaleString()}`);
    
    // Calculate what we can do with available TTRUST
    const maxIntuitWithAvailableTtrust = availableTtrust * exchangeRate;
    const maxAllocationPercent = (maxIntuitWithAvailableTtrust / INTUIT_TOTAL_SUPPLY) * 100;
    
    console.log(`\n🔄 Alternative with available TTRUST:`);
    console.log(`Max INTUIT: ${maxIntuitWithAvailableTtrust.toLocaleString()} INTUIT`);
    console.log(`Max Allocation: ${maxAllocationPercent.toFixed(2)}% of supply`);
    
    return {
      feasible: false,
      intuitAmount: maxIntuitWithAvailableTtrust,
      ttrustAmount: availableTtrust,
      allocationPercent: maxAllocationPercent
    };
  }
  
  console.log(`\n✅ Feasible liquidity setup!`);
  
  return {
    feasible: true,
    intuitAmount: intuitForDex,
    ttrustAmount: requiredTtrust,
    allocationPercent: intuitAllocationPercent
  };
}

// Example scenarios with realistic TTRUST availability
console.log("🚀 INTUIT DEX Liquidity Calculator\n");
console.log("💡 Note: TTRUST is native token with large network supply");
console.log("    Your 5.21 TTRUST is personal balance, not total available\n");

// Scenario 1: 15% allocation, 1:1 ratio (PROFESSIONAL!)
console.log("=" .repeat(50));
console.log("SCENARIO 1: Professional 15% Allocation (1:1 ratio)");
const scenario1 = calculateLiquidity({
  exchangeRate: 1, // 1:1 ratio
  intuitAllocationPercent: 15,
  availableTtrust: 200 // Much more realistic now!
});

// Scenario 2: Your current balance with 1:1 ratio
console.log("\n" + "=".repeat(50));
console.log("SCENARIO 2: Your Current Balance (5.21 TTRUST, 1:1 ratio)");
const scenario2 = calculateLiquidity({
  exchangeRate: 1, // 1:1 ratio
  intuitAllocationPercent: 100, // Will be limited by available TTRUST
  availableTtrust: 5.21
});

// Scenario 3: Small test pool
console.log("\n" + "=".repeat(50));
console.log("SCENARIO 3: Small Test Pool (1:1 ratio)");
const scenario3 = calculateLiquidity({
  exchangeRate: 1, // 1:1 ratio
  intuitAllocationPercent: 1, // 1% allocation for testing
  availableTtrust: 50 // Small test amount
});

// Scenario 4: Full supply with 1:1 ratio
console.log("\n" + "=".repeat(50));
console.log("SCENARIO 4: Full DEX (1:1 ratio, 100% allocation)");
const scenario4 = calculateLiquidity({
  exchangeRate: 1, // 1:1 ratio
  intuitAllocationPercent: 100, // Full allocation
  availableTtrust: 1000000 // Full INTUIT supply equivalent
});

console.log("\n" + "=".repeat(50));
console.log("📝 RECOMMENDATIONS:");
console.log("1. Professional 15% allocation needs only 150,000 TTRUST ✅");
console.log("2. Use 1:1 ratio for fair and simple trading");
console.log("3. 85% goes to Treasury with 4-year vesting (professional!)");
console.log("4. Your 5.21 TTRUST can create 0.52% allocation for testing");

function generateLiquidityScript(scenario: any, scenarioName: string) {
  if (!scenario.feasible && scenario.ttrustAmount > 5.21) return;
  
  console.log(`\n🔧 ${scenarioName} - Liquidity Setup Commands:`);
  console.log(`TTRUST Amount: ${parseEther(scenario.ttrustAmount.toString())}`);
  console.log(`INTUIT Amount: ${parseEther(scenario.intuitAmount.toString())}`);
  console.log(`Allocation: ${scenario.allocationPercent.toFixed(2)}% of INTUIT supply`);
}

generateLiquidityScript(scenario4, "RECOMMENDED START");
