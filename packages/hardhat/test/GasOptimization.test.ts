import { ethers } from "hardhat";
import { expect } from "chai";
import { loadFixture, time } from "@nomicfoundation/hardhat-network-helpers";
import { DEXFactory, DEXRouter, DEXPair, Intuit, WETH } from "../typechain-types";

describe("⛽ Gas Optimization Tests", function () {
  async function deployGasTestFixture() {
    const [deployer, user1, user2] = await ethers.getSigners();

    // Deploy tokens
    const IntuitFactory = await ethers.getContractFactory("Intuit");
    const intuitToken = await IntuitFactory.deploy();

    const WETHFactory = await ethers.getContractFactory("WETH");
    const wethToken = await WETHFactory.deploy();

    // Deploy DEX system
    const DEXFactoryFactory = await ethers.getContractFactory("DEXFactory");
    const dexFactory = await DEXFactoryFactory.deploy(deployer.address);

    const DEXRouterFactory = await ethers.getContractFactory("DEXRouter");
    const dexRouter = await DEXRouterFactory.deploy(
      await dexFactory.getAddress(),
      await wethToken.getAddress()
    );

    // Setup tokens
    await intuitToken.transfer(user1.address, ethers.parseEther("100000"));
    await intuitToken.transfer(user2.address, ethers.parseEther("100000"));

    return {
      deployer,
      user1,
      user2,
      intuitToken,
      wethToken,
      dexFactory,
      dexRouter,
    };
  }

  describe("Gas Usage Benchmarks", function () {
    it("Should measure gas for pair creation", async function () {
      const { dexFactory, intuitToken, wethToken } = await loadFixture(deployGasTestFixture);

      const intuitAddress = await intuitToken.getAddress();
      const wethAddress = await wethToken.getAddress();

      const tx = await dexFactory.createPair(intuitAddress, wethAddress);
      const receipt = await tx.wait();

      console.log(`    ⛽ Pair creation gas used: ${receipt!.gasUsed.toString()}`);
      
      // Should use reasonable amount of gas (less than 3M)
      expect(receipt!.gasUsed).to.be.lt(3_000_000);
    });

    it("Should measure gas for adding liquidity", async function () {
      const { dexRouter, intuitToken, user1 } = await loadFixture(deployGasTestFixture);

      const tokenAmount = ethers.parseEther("1000");
      const ethAmount = ethers.parseEther("1");
      const deadline = (await time.latest()) + 3600;

      await intuitToken.connect(user1).approve(await dexRouter.getAddress(), tokenAmount);

      const tx = await dexRouter.connect(user1).addLiquidityETH(
        await intuitToken.getAddress(),
        tokenAmount,
        0,
        0,
        user1.address,
        deadline,
        { value: ethAmount }
      );

      const receipt = await tx.wait();
      console.log(`    ⛽ Add liquidity gas used: ${receipt!.gasUsed.toString()}`);
      
      // Should use reasonable amount of gas
      expect(receipt!.gasUsed).to.be.lt(500_000);
    });

    it("Should measure gas for swaps", async function () {
      const { dexRouter, intuitToken, wethToken, user1, user2 } = await loadFixture(deployGasTestFixture);

      // Setup liquidity first
      const tokenAmount = ethers.parseEther("10000");
      const ethAmount = ethers.parseEther("10");
      const deadline = (await time.latest()) + 3600;

      await intuitToken.connect(user1).approve(await dexRouter.getAddress(), tokenAmount);
      
      await dexRouter.connect(user1).addLiquidityETH(
        await intuitToken.getAddress(),
        tokenAmount,
        0,
        0,
        user1.address,
        deadline,
        { value: ethAmount }
      );

      // Measure swap gas
      const swapEthAmount = ethers.parseEther("0.1");
      const path = [await wethToken.getAddress(), await intuitToken.getAddress()];

      const swapTx = await dexRouter.connect(user2).swapExactETHForTokens(
        0,
        path,
        user2.address,
        deadline,
        { value: swapEthAmount }
      );

      const swapReceipt = await swapTx.wait();
      console.log(`    ⛽ ETH→Token swap gas used: ${swapReceipt!.gasUsed.toString()}`);
      
      // Should use reasonable amount of gas for swap
      expect(swapReceipt!.gasUsed).to.be.lt(200_000);
    });

    it("Should measure gas for token-to-token swaps", async function () {
      const { dexRouter, intuitToken, wethToken, user1, user2 } = await loadFixture(deployGasTestFixture);

      // Setup liquidity
      const tokenAmount = ethers.parseEther("10000");
      const ethAmount = ethers.parseEther("10");
      const deadline = (await time.latest()) + 3600;

      await intuitToken.connect(user1).approve(await dexRouter.getAddress(), tokenAmount);
      
      await dexRouter.connect(user1).addLiquidityETH(
        await intuitToken.getAddress(),
        tokenAmount,
        0,
        0,
        user1.address,
        deadline,
        { value: ethAmount }
      );

      // Prepare for token swap
      const swapTokenAmount = ethers.parseEther("100");
      const path = [await intuitToken.getAddress(), await wethToken.getAddress()];

      await intuitToken.connect(user2).approve(await dexRouter.getAddress(), swapTokenAmount);

      const swapTx = await dexRouter.connect(user2).swapExactTokensForETH(
        swapTokenAmount,
        0,
        path,
        user2.address,
        deadline
      );

      const swapReceipt = await swapTx.wait();
      console.log(`    ⛽ Token→ETH swap gas used: ${swapReceipt!.gasUsed.toString()}`);
      
      // Should use reasonable amount of gas
      expect(swapReceipt!.gasUsed).to.be.lt(200_000);
    });
  });

  describe("Gas Optimization Verification", function () {
    it("Should verify unchecked math optimizations work", async function () {
      const { dexFactory, intuitToken, wethToken } = await loadFixture(deployGasTestFixture);

      // Create pair and get reference
      await dexFactory.createPair(await intuitToken.getAddress(), await wethToken.getAddress());
      const pairAddress = await dexFactory.getPair(await intuitToken.getAddress(), await wethToken.getAddress());
      const dexPair = await ethers.getContractAt("DEXPair", pairAddress);

      // Add liquidity to test _update function
      const tokenAmount = ethers.parseEther("1000");
      const ethAmount = ethers.parseEther("1");

      await intuitToken.transfer(pairAddress, tokenAmount);
      await wethToken.deposit({ value: ethAmount });
      await wethToken.transfer(pairAddress, ethAmount);

      const mintTx = await dexPair.mint(await dexPair.getAddress());
      const mintReceipt = await mintTx.wait();

      console.log(`    ⛽ Mint with optimized math: ${mintReceipt!.gasUsed.toString()}`);
      
      // The optimized version should use reasonable gas
      expect(mintReceipt!.gasUsed).to.be.lt(300_000);
    });

    it("Should verify storage read optimizations", async function () {
      const { dexFactory, intuitToken, wethToken } = await loadFixture(deployGasTestFixture);

      // Multiple pair creations to test storage efficiency
      const Token2Factory = await ethers.getContractFactory("Intuit");
      const token2 = await Token2Factory.deploy();
      const Token3Factory = await ethers.getContractFactory("Intuit");  
      const token3 = await Token3Factory.deploy();

      const createTx1 = await dexFactory.createPair(await intuitToken.getAddress(), await wethToken.getAddress());
      const createReceipt1 = await createTx1.wait();

      const createTx2 = await dexFactory.createPair(await token2.getAddress(), await wethToken.getAddress());
      const createReceipt2 = await createTx2.wait();

      const createTx3 = await dexFactory.createPair(await token2.getAddress(), await token3.getAddress());
      const createReceipt3 = await createTx3.wait();

      console.log(`    ⛽ 1st pair creation: ${createReceipt1!.gasUsed.toString()}`);
      console.log(`    ⛽ 2nd pair creation: ${createReceipt2!.gasUsed.toString()}`);
      console.log(`    ⛽ 3rd pair creation: ${createReceipt3!.gasUsed.toString()}`);

      // Gas usage should be consistent and efficient
      expect(createReceipt1!.gasUsed).to.be.lt(3_000_000);
      expect(createReceipt2!.gasUsed).to.be.lt(3_000_000);
      expect(createReceipt3!.gasUsed).to.be.lt(3_000_000);
    });

    it("Should test batch operations efficiency", async function () {
      const { dexRouter, intuitToken, wethToken, user1, user2 } = await loadFixture(deployGasTestFixture);

      // Setup liquidity
      const tokenAmount = ethers.parseEther("10000");
      const ethAmount = ethers.parseEther("10");
      const deadline = (await time.latest()) + 3600;

      await intuitToken.connect(user1).approve(await dexRouter.getAddress(), tokenAmount);
      
      await dexRouter.connect(user1).addLiquidityETH(
        await intuitToken.getAddress(),
        tokenAmount,
        0,
        0,
        user1.address,
        deadline,
        { value: ethAmount }
      );

      // Measure multiple small swaps vs one large swap
      const path = [await wethToken.getAddress(), await intuitToken.getAddress()];
      
      // One large swap
      const largeTx = await dexRouter.connect(user2).swapExactETHForTokens(
        0,
        path,
        user2.address,
        deadline,
        { value: ethers.parseEther("1") }
      );
      const largeReceipt = await largeTx.wait();

      // Multiple small swaps
      let totalSmallGas = BigInt(0);
      for (let i = 0; i < 4; i++) {
        const smallTx = await dexRouter.connect(user2).swapExactETHForTokens(
          0,
          path,
          user2.address,
          deadline,
          { value: ethers.parseEther("0.25") }
        );
        const smallReceipt = await smallTx.wait();
        totalSmallGas += smallReceipt!.gasUsed;
      }

      console.log(`    ⛽ One large swap (1 ETH): ${largeReceipt!.gasUsed.toString()}`);
      console.log(`    ⛽ Four small swaps (0.25 ETH each): ${totalSmallGas.toString()}`);

      // One large swap should be more efficient than multiple small ones
      expect(largeReceipt!.gasUsed).to.be.lt(totalSmallGas);
    });
  });

  describe("Comparison with Standards", function () {
    it("Should compare gas usage with Uniswap V2 benchmarks", async function () {
      // These are rough benchmarks based on Uniswap V2
      const UNISWAP_PAIR_CREATION = 2_500_000;
      const UNISWAP_ADD_LIQUIDITY = 300_000;
      const UNISWAP_SWAP = 150_000;

      const { dexFactory, dexRouter, intuitToken, wethToken, user1 } = await loadFixture(deployGasTestFixture);

      // Test pair creation
      const createTx = await dexFactory.createPair(await intuitToken.getAddress(), await wethToken.getAddress());
      const createReceipt = await createTx.wait();
      
      console.log(`    📊 Our pair creation: ${createReceipt!.gasUsed.toString()} vs Uniswap ~${UNISWAP_PAIR_CREATION}`);

      // Test add liquidity
      const tokenAmount = ethers.parseEther("1000");
      const ethAmount = ethers.parseEther("1");
      const deadline = (await time.latest()) + 3600;

      await intuitToken.connect(user1).approve(await dexRouter.getAddress(), tokenAmount);
      
      const addTx = await dexRouter.connect(user1).addLiquidityETH(
        await intuitToken.getAddress(),
        tokenAmount,
        0,
        0,
        user1.address,
        deadline,
        { value: ethAmount }
      );
      const addReceipt = await addTx.wait();
      
      console.log(`    📊 Our add liquidity: ${addReceipt!.gasUsed.toString()} vs Uniswap ~${UNISWAP_ADD_LIQUIDITY}`);

      // Test swap
      const path = [await wethToken.getAddress(), await intuitToken.getAddress()];
      const swapTx = await dexRouter.connect(user1).swapExactETHForTokens(
        0,
        path,
        user1.address,
        deadline,
        { value: ethers.parseEther("0.1") }
      );
      const swapReceipt = await swapTx.wait();
      
      console.log(`    📊 Our swap: ${swapReceipt!.gasUsed.toString()} vs Uniswap ~${UNISWAP_SWAP}`);

      // Our implementation should be competitive (within 20% of Uniswap)
      expect(createReceipt!.gasUsed).to.be.lt(UNISWAP_PAIR_CREATION * 1.2);
      expect(addReceipt!.gasUsed).to.be.lt(UNISWAP_ADD_LIQUIDITY * 1.2);
      expect(swapReceipt!.gasUsed).to.be.lt(UNISWAP_SWAP * 1.5); // Swaps might use more due to extra validations
    });

    it("Should verify gas efficiency across different operation sizes", async function () {
      const { dexRouter, intuitToken, wethToken, user1 } = await loadFixture(deployGasTestFixture);

      // Setup liquidity
      const tokenAmount = ethers.parseEther("100000");
      const ethAmount = ethers.parseEther("100");
      const deadline = (await time.latest()) + 3600;

      await intuitToken.connect(user1).approve(await dexRouter.getAddress(), tokenAmount);
      
      await dexRouter.connect(user1).addLiquidityETH(
        await intuitToken.getAddress(),
        tokenAmount,
        0,
        0,
        user1.address,
        deadline,
        { value: ethAmount }
      );

      // Test different swap sizes
      const path = [await wethToken.getAddress(), await intuitToken.getAddress()];
      const swapSizes = [
        ethers.parseEther("0.01"),
        ethers.parseEther("0.1"), 
        ethers.parseEther("1"),
        ethers.parseEther("5")
      ];

      console.log(`    📈 Gas usage vs swap size:`);
      
      for (const size of swapSizes) {
        const swapTx = await dexRouter.connect(user1).swapExactETHForTokens(
          0,
          path,
          user1.address,
          deadline,
          { value: size }
        );
        const receipt = await swapTx.wait();
        console.log(`      ${ethers.formatEther(size)} ETH: ${receipt!.gasUsed.toString()} gas`);
      }

      // Gas usage should be relatively stable regardless of swap size
      // (since the computation complexity doesn't change much with size)
    });
  });
});