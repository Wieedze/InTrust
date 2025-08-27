import { ethers } from "hardhat";
import { expect } from "chai";
import { loadFixture, time } from "@nomicfoundation/hardhat-network-helpers";
import { DEXFactory, DEXRouter, DEXPair, Intuit, WETH } from "../typechain-types";

describe("🔄 DEXRouter Tests", function () {
  async function deployRouterFixture() {
    const [deployer, user1, user2] = await ethers.getSigners();

    // Deploy tokens
    const IntuitFactory = await ethers.getContractFactory("Intuit");
    const intuitToken = await IntuitFactory.deploy();

    const WETHFactory = await ethers.getContractFactory("WETH");
    const wethToken = await WETHFactory.deploy();

    // Deploy DEX Factory
    const DEXFactoryFactory = await ethers.getContractFactory("DEXFactory");
    const dexFactory = await DEXFactoryFactory.deploy(deployer.address);

    // Deploy DEX Router
    const DEXRouterFactory = await ethers.getContractFactory("DEXRouter");
    const dexRouter = await DEXRouterFactory.deploy(
      await dexFactory.getAddress(),
      await wethToken.getAddress()
    );

    // Initial token distribution
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

  describe("Deployment", function () {
    it("Should deploy with correct factory and WETH addresses", async function () {
      const { dexRouter, dexFactory, wethToken } = await loadFixture(deployRouterFixture);

      expect(await dexRouter.factory()).to.equal(await dexFactory.getAddress());
      expect(await dexRouter.WETH()).to.equal(await wethToken.getAddress());
    });
  });

  describe("Liquidity Management", function () {
    it("Should add liquidity ETH successfully", async function () {
      const { dexRouter, intuitToken, user1 } = await loadFixture(deployRouterFixture);

      const tokenAmount = ethers.parseEther("1000");
      const ethAmount = ethers.parseEther("1");
      const deadline = (await time.latest()) + 3600; // 1 hour from now

      // Approve router to spend tokens
      await intuitToken.connect(user1).approve(await dexRouter.getAddress(), tokenAmount);

      const tx = await dexRouter.connect(user1).addLiquidityETH(
        await intuitToken.getAddress(),
        tokenAmount,
        0, // amountTokenMin
        0, // amountETHMin  
        user1.address,
        deadline,
        { value: ethAmount }
      );

      expect(tx).to.emit(dexRouter, "LiquidityAdded");
      
      // Verify tokens were transferred
      const routerAddress = await dexRouter.getAddress();
      expect(await intuitToken.balanceOf(user1.address)).to.be.lt(ethers.parseEther("100000"));
    });

    it("Should add liquidity between two tokens", async function () {
      const { dexRouter, intuitToken, wethToken, user1 } = await loadFixture(deployRouterFixture);

      const tokenAAmount = ethers.parseEther("1000");
      const tokenBAmount = ethers.parseEther("1");
      const deadline = (await time.latest()) + 3600;

      // Wrap some ETH
      await wethToken.connect(user1).deposit({ value: ethers.parseEther("5") });

      // Approve router
      await intuitToken.connect(user1).approve(await dexRouter.getAddress(), tokenAAmount);
      await wethToken.connect(user1).approve(await dexRouter.getAddress(), tokenBAmount);

      const tx = await dexRouter.connect(user1).addLiquidity(
        await intuitToken.getAddress(),
        await wethToken.getAddress(),
        tokenAAmount,
        tokenBAmount,
        0, // amountAMin
        0, // amountBMin
        user1.address,
        deadline
      );

      expect(tx).to.not.be.reverted;
    });

    it("Should fail with expired deadline", async function () {
      const { dexRouter, intuitToken, user1 } = await loadFixture(deployRouterFixture);

      const tokenAmount = ethers.parseEther("1000");
      const ethAmount = ethers.parseEther("1");
      const expiredDeadline = (await time.latest()) - 3600; // 1 hour ago

      await intuitToken.connect(user1).approve(await dexRouter.getAddress(), tokenAmount);

      await expect(
        dexRouter.connect(user1).addLiquidityETH(
          await intuitToken.getAddress(),
          tokenAmount,
          0,
          0,
          user1.address,
          expiredDeadline,
          { value: ethAmount }
        )
      ).to.be.revertedWith("DEXRouter: EXPIRED");
    });

    it("Should fail with invalid token address", async function () {
      const { dexRouter, user1 } = await loadFixture(deployRouterFixture);

      const deadline = (await time.latest()) + 3600;

      await expect(
        dexRouter.connect(user1).addLiquidityETH(
          ethers.ZeroAddress,
          ethers.parseEther("1000"),
          0,
          0,
          user1.address,
          deadline,
          { value: ethers.parseEther("1") }
        )
      ).to.be.revertedWith("DEXRouter: INVALID_TOKEN");
    });

    it("Should fail with zero token amount", async function () {
      const { dexRouter, intuitToken, user1 } = await loadFixture(deployRouterFixture);

      const deadline = (await time.latest()) + 3600;

      await expect(
        dexRouter.connect(user1).addLiquidityETH(
          await intuitToken.getAddress(),
          0, // Zero amount
          0,
          0,
          user1.address,
          deadline,
          { value: ethers.parseEther("1") }
        )
      ).to.be.revertedWith("DEXRouter: INVALID_TOKEN_AMOUNT");
    });

    it("Should fail with zero ETH amount", async function () {
      const { dexRouter, intuitToken, user1 } = await loadFixture(deployRouterFixture);

      const deadline = (await time.latest()) + 3600;

      await intuitToken.connect(user1).approve(await dexRouter.getAddress(), ethers.parseEther("1000"));

      await expect(
        dexRouter.connect(user1).addLiquidityETH(
          await intuitToken.getAddress(),
          ethers.parseEther("1000"),
          0,
          0,
          user1.address,
          deadline,
          { value: 0 } // Zero ETH
        )
      ).to.be.revertedWith("DEXRouter: INVALID_ETH_AMOUNT");
    });

    it("Should fail with invalid recipient address", async function () {
      const { dexRouter, intuitToken, user1 } = await loadFixture(deployRouterFixture);

      const deadline = (await time.latest()) + 3600;

      await intuitToken.connect(user1).approve(await dexRouter.getAddress(), ethers.parseEther("1000"));

      await expect(
        dexRouter.connect(user1).addLiquidityETH(
          await intuitToken.getAddress(),
          ethers.parseEther("1000"),
          0,
          0,
          ethers.ZeroAddress, // Invalid recipient
          deadline,
          { value: ethers.parseEther("1") }
        )
      ).to.be.revertedWith("DEXRouter: INVALID_TO_ADDRESS");
    });
  });

  describe("Token Swapping", function () {
    async function setupLiquidityForSwaps() {
      const fixture = await loadFixture(deployRouterFixture);
      const { dexRouter, intuitToken, user1 } = fixture;

      // Add initial liquidity
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

      return fixture;
    }

    it("Should swap exact ETH for tokens", async function () {
      const { dexRouter, intuitToken, wethToken, user2 } = await setupLiquidityForSwaps();

      const ethAmount = ethers.parseEther("0.1");
      const deadline = (await time.latest()) + 3600;
      const initialBalance = await intuitToken.balanceOf(user2.address);

      const path = [await wethToken.getAddress(), await intuitToken.getAddress()];

      const tx = await dexRouter.connect(user2).swapExactETHForTokens(
        0, // amountOutMin
        path,
        user2.address,
        deadline,
        { value: ethAmount }
      );

      expect(tx).to.emit(dexRouter, "SwapETHForTokens");

      const finalBalance = await intuitToken.balanceOf(user2.address);
      expect(finalBalance).to.be.gt(initialBalance);
    });

    it("Should swap exact tokens for ETH", async function () {
      const { dexRouter, intuitToken, wethToken, user2 } = await setupLiquidityForSwaps();

      const tokenAmount = ethers.parseEther("100");
      const deadline = (await time.latest()) + 3600;
      const initialETHBalance = await ethers.provider.getBalance(user2.address);

      // Approve router to spend tokens
      await intuitToken.connect(user2).approve(await dexRouter.getAddress(), tokenAmount);

      const path = [await intuitToken.getAddress(), await wethToken.getAddress()];

      const tx = await dexRouter.connect(user2).swapExactTokensForETH(
        tokenAmount,
        0, // amountOutMin
        path,
        user2.address,
        deadline
      );

      expect(tx).to.emit(dexRouter, "SwapTokensForETH");

      const finalETHBalance = await ethers.provider.getBalance(user2.address);
      // Should have more ETH (minus gas costs)
      expect(finalETHBalance).to.be.gt(initialETHBalance.sub(ethers.parseEther("0.01")));
    });

    it("Should fail swap with insufficient output amount", async function () {
      const { dexRouter, intuitToken, wethToken, user2 } = await setupLiquidityForSwaps();

      const ethAmount = ethers.parseEther("0.1");
      const deadline = (await time.latest()) + 3600;
      const path = [await wethToken.getAddress(), await intuitToken.getAddress()];

      // Set minimum output too high
      const unreasonableMinOutput = ethers.parseEther("1000000");

      await expect(
        dexRouter.connect(user2).swapExactETHForTokens(
          unreasonableMinOutput,
          path,
          user2.address,
          deadline,
          { value: ethAmount }
        )
      ).to.be.revertedWith("DEXRouter: INSUFFICIENT_OUTPUT_AMOUNT");
    });

    it("Should fail with invalid path", async function () {
      const { dexRouter, user2 } = await setupLiquidityForSwaps();

      const deadline = (await time.latest()) + 3600;
      const invalidPath = [ethers.ZeroAddress]; // Path too short

      await expect(
        dexRouter.connect(user2).swapExactETHForTokens(
          0,
          invalidPath,
          user2.address,
          deadline,
          { value: ethers.parseEther("0.1") }
        )
      ).to.be.revertedWith("DEXRouter: INVALID_PATH");
    });

    it("Should fail with zero swap amount", async function () {
      const { dexRouter, intuitToken, wethToken, user2 } = await setupLiquidityForSwaps();

      const deadline = (await time.latest()) + 3600;
      const path = [await intuitToken.getAddress(), await wethToken.getAddress()];

      await intuitToken.connect(user2).approve(await dexRouter.getAddress(), ethers.parseEther("100"));

      await expect(
        dexRouter.connect(user2).swapExactTokensForETH(
          0, // Zero amount
          0,
          path,
          user2.address,
          deadline
        )
      ).to.be.revertedWith("DEXRouter: INVALID_AMOUNT");
    });
  });

  describe("Price Calculations", function () {
    it("Should calculate quote correctly", async function () {
      const { dexRouter } = await loadFixture(deployRouterFixture);

      const amountA = ethers.parseEther("100");
      const reserveA = ethers.parseEther("1000");
      const reserveB = ethers.parseEther("2000");

      const quote = await dexRouter.quote(amountA, reserveA, reserveB);
      
      // Expected: 100 * 2000 / 1000 = 200
      expect(quote).to.equal(ethers.parseEther("200"));
    });

    it("Should calculate amount out with fee", async function () {
      const { dexRouter } = await loadFixture(deployRouterFixture);

      const amountIn = ethers.parseEther("100");
      const reserveIn = ethers.parseEther("1000");
      const reserveOut = ethers.parseEther("1000");

      const amountOut = await dexRouter.getAmountOut(amountIn, reserveIn, reserveOut);
      
      // With 0.3% fee, should be less than 100
      expect(amountOut).to.be.lt(ethers.parseEther("100"));
      expect(amountOut).to.be.gt(ethers.parseEther("90")); // But more than 90
    });

    it("Should fail quote with insufficient liquidity", async function () {
      const { dexRouter } = await loadFixture(deployRouterFixture);

      await expect(
        dexRouter.quote(ethers.parseEther("100"), 0, ethers.parseEther("1000"))
      ).to.be.revertedWith("DEXRouter: INSUFFICIENT_LIQUIDITY");
    });
  });
});