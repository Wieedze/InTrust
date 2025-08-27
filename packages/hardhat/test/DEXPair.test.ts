import { ethers } from "hardhat";
import { expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { DEXFactory, DEXPair, Intuit, WETH } from "../typechain-types";

describe("🔗 DEXPair Tests", function () {
  async function deployPairFixture() {
    const [deployer, user1, user2] = await ethers.getSigners();

    // Deploy tokens
    const IntuitFactory = await ethers.getContractFactory("Intuit");
    const intuitToken = await IntuitFactory.deploy();

    const WETHFactory = await ethers.getContractFactory("WETH");
    const wethToken = await WETHFactory.deploy();

    // Deploy DEX Factory
    const DEXFactoryFactory = await ethers.getContractFactory("DEXFactory");
    const dexFactory = await DEXFactoryFactory.deploy(deployer.address);

    // Create pair
    const intuitAddress = await intuitToken.getAddress();
    const wethAddress = await wethToken.getAddress();
    
    await dexFactory.createPair(intuitAddress, wethAddress);
    const pairAddress = await dexFactory.getPair(intuitAddress, wethAddress);
    
    const dexPair = await ethers.getContractAt("DEXPair", pairAddress);

    // Initial token distribution
    const initialSupply = ethers.parseEther("1000000"); // 1M tokens
    
    // Give users some tokens
    await intuitToken.transfer(user1.address, ethers.parseEther("100000"));
    await intuitToken.transfer(user2.address, ethers.parseEther("100000"));

    // Wrap some ETH for testing
    await wethToken.deposit({ value: ethers.parseEther("100") });
    await wethToken.transfer(user1.address, ethers.parseEther("50"));
    await wethToken.transfer(user2.address, ethers.parseEther("25"));

    return {
      deployer,
      user1,
      user2,
      intuitToken,
      wethToken,
      dexFactory,
      dexPair,
      intuitAddress,
      wethAddress,
    };
  }

  describe("Initialization", function () {
    it("Should be initialized correctly", async function () {
      const { dexPair, dexFactory, intuitAddress, wethAddress } = await loadFixture(deployPairFixture);

      expect(await dexPair.factory()).to.equal(await dexFactory.getAddress());
      expect(await dexPair.totalLiquidity()).to.equal(0);
      
      // Check token order (should be sorted)
      const token0 = await dexPair.token0();
      const token1 = await dexPair.token1();
      
      expect(token0 < token1).to.be.true;
      expect([token0, token1]).to.include(intuitAddress);
      expect([token0, token1]).to.include(wethAddress);
    });

    it("Should have zero reserves initially", async function () {
      const { dexPair } = await loadFixture(deployPairFixture);

      const [reserve0, reserve1] = await dexPair.getReserves();
      expect(reserve0).to.equal(0);
      expect(reserve1).to.equal(0);
    });
  });

  describe("Liquidity Provision", function () {
    it("Should mint liquidity tokens for first provider", async function () {
      const { dexPair, intuitToken, wethToken, user1 } = await loadFixture(deployPairFixture);

      const intuitAmount = ethers.parseEther("1000");
      const wethAmount = ethers.parseEther("1");

      // Approve and transfer tokens to pair
      await intuitToken.connect(user1).transfer(await dexPair.getAddress(), intuitAmount);
      await wethToken.connect(user1).transfer(await dexPair.getAddress(), wethAmount);

      // Mint liquidity
      const tx = await dexPair.mint(user1.address);
      
      expect(tx).to.emit(dexPair, "Mint");
      
      const userLiquidity = await dexPair.getLiquidity(user1.address);
      expect(userLiquidity).to.be.gt(0);
      
      const totalLiquidity = await dexPair.totalLiquidity();
      expect(totalLiquidity).to.be.gt(1000); // Minimum liquidity locked
    });

    it("Should handle proportional liquidity additions", async function () {
      const { dexPair, intuitToken, wethToken, user1, user2 } = await loadFixture(deployPairFixture);

      // First provider
      const intuitAmount1 = ethers.parseEther("1000");
      const wethAmount1 = ethers.parseEther("1");

      await intuitToken.connect(user1).transfer(await dexPair.getAddress(), intuitAmount1);
      await wethToken.connect(user1).transfer(await dexPair.getAddress(), wethAmount1);
      await dexPair.mint(user1.address);

      const totalLiquidityAfterFirst = await dexPair.totalLiquidity();
      
      // Second provider - proportional amounts
      const intuitAmount2 = ethers.parseEther("500"); // Half the INTUIT
      const wethAmount2 = ethers.parseEther("0.5"); // Half the WETH

      await intuitToken.connect(user2).transfer(await dexPair.getAddress(), intuitAmount2);
      await wethToken.connect(user2).transfer(await dexPair.getAddress(), wethAmount2);
      await dexPair.mint(user2.address);

      const user2Liquidity = await dexPair.getLiquidity(user2.address);
      const totalLiquidityAfterSecond = await dexPair.totalLiquidity();
      
      // Second provider should get half the liquidity tokens
      const expectedLiquidity = totalLiquidityAfterFirst / BigInt(2);
      expect(user2Liquidity).to.be.closeTo(expectedLiquidity, ethers.parseEther("1"));
    });
  });

  describe("Swapping", function () {
    async function setupLiquidity() {
      const fixture = await loadFixture(deployPairFixture);
      const { dexPair, intuitToken, wethToken, user1 } = fixture;

      // Add initial liquidity: 1000 INTUIT : 1 WETH
      const intuitAmount = ethers.parseEther("1000");
      const wethAmount = ethers.parseEther("1");

      await intuitToken.connect(user1).transfer(await dexPair.getAddress(), intuitAmount);
      await wethToken.connect(user1).transfer(await dexPair.getAddress(), wethAmount);
      await dexPair.mint(user1.address);

      return fixture;
    }

    it("Should execute basic swap correctly", async function () {
      const { dexPair, intuitToken, wethToken, user2, intuitAddress, wethAddress } = await setupLiquidity();

      // User2 wants to swap 100 INTUIT for WETH
      const swapAmount = ethers.parseEther("100");
      
      // Transfer INTUIT to pair
      await intuitToken.connect(user2).transfer(await dexPair.getAddress(), swapAmount);

      // Calculate expected output (accounting for 0.3% fee)
      const [reserve0, reserve1] = await dexPair.getReserves();
      const token0 = await dexPair.token0();
      
      let intuitReserve, wethReserve, amountOut;
      if (token0 === intuitAddress) {
        intuitReserve = reserve0;
        wethReserve = reserve1;
        amountOut = await getAmountOut(swapAmount, intuitReserve, wethReserve);
        
        // Execute swap: 0 INTUIT out, amountOut WETH out
        await dexPair.swap(0, amountOut, user2.address, "0x");
      } else {
        intuitReserve = reserve1;
        wethReserve = reserve0;
        amountOut = await getAmountOut(swapAmount, intuitReserve, wethReserve);
        
        // Execute swap: amountOut WETH out, 0 INTUIT out  
        await dexPair.swap(amountOut, 0, user2.address, "0x");
      }

      // Check user received WETH
      const userWethBalance = await wethToken.balanceOf(user2.address);
      expect(userWethBalance).to.be.gt(ethers.parseEther("25")); // More than initial 25
    });

    it("Should maintain constant product invariant", async function () {
      const { dexPair, intuitToken, user2 } = await setupLiquidity();

      const [reserveBefore0, reserveBefore1] = await dexPair.getReserves();
      const kBefore = reserveBefore0 * reserveBefore1;

      // Execute a small swap
      const swapAmount = ethers.parseEther("10");
      await intuitToken.connect(user2).transfer(await dexPair.getAddress(), swapAmount);
      
      // Calculate and execute swap
      const amountOut = await getAmountOut(swapAmount, reserveBefore0, reserveBefore1);
      await dexPair.swap(0, amountOut, user2.address, "0x");

      const [reserveAfter0, reserveAfter1] = await dexPair.getReserves();
      const kAfter = reserveAfter0 * reserveAfter1;

      // K should increase slightly due to fees
      expect(kAfter).to.be.gte(kBefore);
    });

    it("Should fail with insufficient output", async function () {
      const { dexPair, intuitToken, user2 } = await setupLiquidity();

      const swapAmount = ethers.parseEther("10");
      await intuitToken.connect(user2).transfer(await dexPair.getAddress(), swapAmount);

      // Try to get more output than possible
      const [reserve0, reserve1] = await dexPair.getReserves();
      const maxOutput = reserve1; // Try to take all reserves

      await expect(
        dexPair.swap(0, maxOutput, user2.address, "0x")
      ).to.be.revertedWith("DEXPair: INSUFFICIENT_LIQUIDITY");
    });
  });

  describe("Liquidity Removal", function () {
    it("Should burn liquidity tokens and return underlying assets", async function () {
      const { dexPair, intuitToken, wethToken, user1 } = await loadFixture(deployPairFixture);

      // Add liquidity first
      const intuitAmount = ethers.parseEther("1000");
      const wethAmount = ethers.parseEther("1");

      await intuitToken.connect(user1).transfer(await dexPair.getAddress(), intuitAmount);
      await wethToken.connect(user1).transfer(await dexPair.getAddress(), wethAmount);
      await dexPair.mint(user1.address);

      const userLiquidity = await dexPair.getLiquidity(user1.address);
      const initialIntuitBalance = await intuitToken.balanceOf(user1.address);
      const initialWethBalance = await wethToken.balanceOf(user1.address);

      // Transfer liquidity tokens to pair for burning
      await dexPair.connect(user1).transfer(await dexPair.getAddress(), userLiquidity);
      
      // Burn liquidity
      const tx = await dexPair.burn(user1.address);
      expect(tx).to.emit(dexPair, "Burn");

      // Check user got tokens back
      const finalIntuitBalance = await intuitToken.balanceOf(user1.address);
      const finalWethBalance = await wethToken.balanceOf(user1.address);

      expect(finalIntuitBalance).to.be.gt(initialIntuitBalance);
      expect(finalWethBalance).to.be.gt(initialWethBalance);
    });
  });

  // Helper function to calculate swap output with fee
  async function getAmountOut(amountIn: bigint, reserveIn: bigint, reserveOut: bigint): Promise<bigint> {
    const amountInWithFee = amountIn * BigInt(997);
    const numerator = amountInWithFee * reserveOut;
    const denominator = reserveIn * BigInt(1000) + amountInWithFee;
    return numerator / denominator;
  }
});