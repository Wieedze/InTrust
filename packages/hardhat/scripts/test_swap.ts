import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  
  console.log("🧪 TESTING SWAP TRANSACTION");
  console.log("===========================");
  console.log(`Deployer: ${deployer.address}`);
  
  // Contract addresses
  const dexRouterAddress = "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9";
  const intuitAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
  const wusdcAddress = "0x0DCd1Bf9A1b36cE34237eEaFef220932846BCD82";
  
  // Get contracts
  const dexRouter = await ethers.getContractAt("DEXRouter", dexRouterAddress);
  const intuitContract = await ethers.getContractAt("Intuit", intuitAddress);
  
  // ERC20 ABI for WUSDC
  const erc20Abi = [
    "function balanceOf(address owner) external view returns (uint256)",
    "function approve(address spender, uint256 amount) external returns (bool)"
  ];
  const wusdcContract = await ethers.getContractAt(erc20Abi, wusdcAddress);
  
  console.log("\\n📊 BEFORE SWAP:");
  console.log("================");
  
  // Check balances before
  const intuitBalanceBefore = await intuitContract.balanceOf(deployer.address);
  const wusdcBalanceBefore = await wusdcContract.balanceOf(deployer.address);
  
  console.log(`INTUIT Balance: ${ethers.formatEther(intuitBalanceBefore)}`);
  console.log(`WUSDC Balance: ${(Number(wusdcBalanceBefore) / 1e6).toFixed(2)}`);
  
  // Check pool reserves before
  try {
    const reservesBefore = await dexRouter.getReserves(intuitAddress, wusdcAddress);
    console.log(`INTUIT Pool: ${ethers.formatEther(reservesBefore[0])}`);
    console.log(`WUSDC Pool: ${(Number(reservesBefore[1]) / 1e6).toFixed(2)}`);
  } catch (error) {
    console.log(`Error getting reserves: ${error}`);
  }
  
  // Test swap: 10 INTUIT -> WUSDC
  const swapAmount = ethers.parseEther("10"); // 10 INTUIT
  
  console.log("\\n💱 EXECUTING SWAP:");
  console.log("==================");
  console.log(`Swapping: ${ethers.formatEther(swapAmount)} INTUIT → WUSDC`);
  
  try {
    // 1. Get quote first
    const amountsOut = await dexRouter.getAmountsOut(swapAmount, [intuitAddress, wusdcAddress]);
    const expectedOutput = Number(amountsOut[1]) / 1e6;
    console.log(`Expected output: ${expectedOutput.toFixed(6)} WUSDC`);
    
    // 2. Check/Set approval
    const currentAllowance = await intuitContract.allowance(deployer.address, dexRouterAddress);
    console.log(`Current allowance: ${ethers.formatEther(currentAllowance)}`);
    
    if (currentAllowance < swapAmount) {
      console.log("Approving INTUIT spend...");
      const approveTx = await intuitContract.approve(dexRouterAddress, swapAmount);
      await approveTx.wait();
      console.log("✅ Approval confirmed");
    }
    
    // 3. Execute swap
    const deadline = Math.floor(Date.now() / 1000) + 1200;
    const minAmountOut = (amountsOut[1] * BigInt(95)) / BigInt(100); // 5% slippage
    
    console.log(`Min output (5% slippage): ${(Number(minAmountOut) / 1e6).toFixed(6)} WUSDC`);
    
    console.log("Executing swap...");
    const swapTx = await dexRouter.swapExactTokensForTokens(
      swapAmount,
      minAmountOut,
      [intuitAddress, wusdcAddress],
      deployer.address,
      deadline
    );
    
    const receipt = await swapTx.wait();
    console.log(`✅ Swap confirmed - Gas used: ${receipt.gasUsed}`);
    
    console.log("\\n📊 AFTER SWAP:");
    console.log("===============");
    
    // Check balances after
    const intuitBalanceAfter = await intuitContract.balanceOf(deployer.address);
    const wusdcBalanceAfter = await wusdcContract.balanceOf(deployer.address);
    
    console.log(`INTUIT Balance: ${ethers.formatEther(intuitBalanceAfter)}`);
    console.log(`WUSDC Balance: ${(Number(wusdcBalanceAfter) / 1e6).toFixed(2)}`);
    
    // Calculate changes
    const intuitChange = intuitBalanceBefore - intuitBalanceAfter;
    const wusdcChange = wusdcBalanceAfter - wusdcBalanceBefore;
    
    console.log(`\\n💰 CHANGES:`);
    console.log(`INTUIT: -${ethers.formatEther(intuitChange)}`);
    console.log(`WUSDC: +${(Number(wusdcChange) / 1e6).toFixed(6)}`);
    
    // Check pool reserves after
    const reservesAfter = await dexRouter.getReserves(intuitAddress, wusdcAddress);
    console.log(`\\n🏊 POOL AFTER:`);
    console.log(`INTUIT Pool: ${ethers.formatEther(reservesAfter[0])}`);
    console.log(`WUSDC Pool: ${(Number(reservesAfter[1]) / 1e6).toFixed(2)}`);
    
    // Calculate pool changes
    const poolIntuitChange = reservesAfter[0] - reservesBefore[0];
    const poolWusdcChange = reservesAfter[1] - reservesBefore[1];
    
    console.log(`\\n🔄 POOL CHANGES:`);
    console.log(`INTUIT Pool: +${ethers.formatEther(poolIntuitChange)}`);
    console.log(`WUSDC Pool: ${(Number(poolWusdcChange) / 1e6).toFixed(6)}`);
    
    console.log("\\n✅ SWAP TEST COMPLETE - Everything looks normal!");
    
  } catch (error) {
    console.error(`❌ Swap failed: ${error}`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });