import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  
  console.log("🔍 CHECKING POOLS AND BALANCES");
  console.log("==============================");
  console.log(`Deployer: ${deployer.address}`);
  
  // Contract addresses
  const dexRouterAddress = "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9";
  const dexFactoryAddress = "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0";
  
  // Token addresses  
  const ttrustAddress = "0xA54b4E6e356b963Ee00d1C947f478d9194a1a210";
  const wethAddress = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";
  const intuitAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
  const wbtcAddress = "0xA51c1fc2f0D1a1b8494Ed1FE312d7C3a78Ed91C0";
  const wusdcAddress = "0x0DCd1Bf9A1b36cE34237eEaFef220932846BCD82";
  const wusdtAddress = "0x9A676e781A523b5d0C0e43731313A708CB607508";
  
  // Get contracts
  const dexRouter = await ethers.getContractAt("DEXRouter", dexRouterAddress);
  const dexFactory = await ethers.getContractAt("DEXFactory", dexFactoryAddress);
  
  // ERC20 ABI for tokens
  const erc20Abi = [
    "function balanceOf(address owner) external view returns (uint256)",
    "function decimals() external view returns (uint8)",
    "function symbol() external view returns (string)"
  ];
  
  const tokens = [
    { name: "TRUST", address: ttrustAddress, decimals: 18 },
    { name: "WETH", address: wethAddress, decimals: 18 },
    { name: "INTUIT", address: intuitAddress, decimals: 18 },
    { name: "WBTC", address: wbtcAddress, decimals: 8 },
    { name: "WUSDC", address: wusdcAddress, decimals: 6 },
    { name: "WUSDT", address: wusdtAddress, decimals: 6 },
  ];
  
  console.log("\\n💰 USER TOKEN BALANCES");
  console.log("======================");
  
  for (const token of tokens) {
    try {
      const tokenContract = await ethers.getContractAt(erc20Abi, token.address);
      const balance = await tokenContract.balanceOf(deployer.address);
      
      let formattedBalance;
      if (token.decimals === 18) {
        formattedBalance = ethers.formatEther(balance);
      } else {
        formattedBalance = (Number(balance) / Math.pow(10, token.decimals)).toFixed(token.decimals === 6 ? 2 : 8);
      }
      
      console.log(`${token.name.padEnd(8)}: ${formattedBalance}`);
    } catch (error) {
      console.log(`${token.name.padEnd(8)}: ERROR - ${error}`);
    }
  }
  
  console.log("\\n🏊 LIQUIDITY POOLS STATUS");
  console.log("========================");
  
  const pairs = [
    { token0: "INTUIT", token1: "WBTC", address0: intuitAddress, address1: wbtcAddress },
    { token0: "INTUIT", token1: "WUSDC", address0: intuitAddress, address1: wusdcAddress },
    { token0: "WUSDC", token1: "WUSDT", address0: wusdcAddress, address1: wusdtAddress },
    { token0: "WBTC", token1: "WUSDC", address0: wbtcAddress, address1: wusdcAddress },
  ];
  
  for (const pair of pairs) {
    try {
      const pairAddress = await dexFactory.getPair(pair.address0, pair.address1);
      
      if (pairAddress === "0x0000000000000000000000000000000000000000") {
        console.log(`${pair.token0}/${pair.token1}: No pair exists`);
        continue;
      }
      
      console.log(`\\n📈 ${pair.token0}/${pair.token1} Pair:`);
      console.log(`   Address: ${pairAddress}`);
      
      // Get reserves using router
      const reserves = await dexRouter.getReserves(pair.address0, pair.address1);
      
      const token0Contract = await ethers.getContractAt(erc20Abi, pair.address0);
      const token1Contract = await ethers.getContractAt(erc20Abi, pair.address1);
      
      const token0Decimals = await token0Contract.decimals();
      const token1Decimals = await token1Contract.decimals();
      
      let reserve0Formatted, reserve1Formatted;
      if (token0Decimals === 18) {
        reserve0Formatted = ethers.formatEther(reserves[0]);
      } else {
        reserve0Formatted = (Number(reserves[0]) / Math.pow(10, token0Decimals)).toFixed(token0Decimals === 6 ? 2 : 8);
      }
      
      if (token1Decimals === 18) {
        reserve1Formatted = ethers.formatEther(reserves[1]);
      } else {
        reserve1Formatted = (Number(reserves[1]) / Math.pow(10, token1Decimals)).toFixed(token1Decimals === 6 ? 2 : 8);
      }
      
      console.log(`   ${pair.token0} Reserve: ${reserve0Formatted}`);
      console.log(`   ${pair.token1} Reserve: ${reserve1Formatted}`);
      
      // Calculate rate if both reserves > 0
      if (reserves[0] > 0 && reserves[1] > 0) {
        const rate = (Number(reserves[1]) / Math.pow(10, token1Decimals)) / (Number(reserves[0]) / Math.pow(10, token0Decimals));
        console.log(`   Rate: 1 ${pair.token0} = ${rate.toFixed(6)} ${pair.token1}`);
      }
      
    } catch (error) {
      console.log(`${pair.token0}/${pair.token1}: ERROR - ${error}`);
    }
  }
  
  console.log("\\n🧪 TESTING SWAP QUOTES");
  console.log("======================");
  
  // Test a small swap quote
  try {
    const testAmount = ethers.parseEther("1"); // 1 INTUIT
    const amountsOut = await dexRouter.getAmountsOut(testAmount, [intuitAddress, wusdcAddress]);
    
    const outputAmount = Number(amountsOut[1]) / Math.pow(10, 6); // WUSDC has 6 decimals
    console.log(`1 INTUIT → ${outputAmount.toFixed(6)} WUSDC`);
    
  } catch (error) {
    console.log(`Swap quote failed: ${error}`);
  }
  
  console.log("\\n✅ ANALYSIS COMPLETE");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });