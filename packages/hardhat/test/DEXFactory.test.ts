import { ethers } from "hardhat";
import { expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { DEXFactory, DEXPair, Intuit, WETH } from "../typechain-types";

describe("🏭 DEXFactory Tests", function () {
  async function deployFactoryFixture() {
    const [deployer, user1, user2] = await ethers.getSigners();

    // Deploy tokens
    const IntuitFactory = await ethers.getContractFactory("Intuit");
    const intuitToken = await IntuitFactory.deploy();

    const WETHFactory = await ethers.getContractFactory("WETH");
    const wethToken = await WETHFactory.deploy();

    // Deploy DEX Factory
    const DEXFactoryFactory = await ethers.getContractFactory("DEXFactory");
    const dexFactory = await DEXFactoryFactory.deploy(deployer.address);

    return {
      deployer,
      user1,
      user2,
      intuitToken,
      wethToken,
      dexFactory,
    };
  }

  describe("Deployment", function () {
    it("Should deploy with correct fee setter", async function () {
      const { dexFactory, deployer } = await loadFixture(deployFactoryFixture);
      
      expect(await dexFactory.feeToSetter()).to.equal(deployer.address);
      expect(await dexFactory.feeTo()).to.equal(ethers.ZeroAddress);
      expect(await dexFactory.allPairsLength()).to.equal(0);
    });
  });

  describe("Pair Creation", function () {
    it("Should create a new pair successfully", async function () {
      const { dexFactory, intuitToken, wethToken } = await loadFixture(deployFactoryFixture);

      const intuitAddress = await intuitToken.getAddress();
      const wethAddress = await wethToken.getAddress();

      // Create pair
      const tx = await dexFactory.createPair(intuitAddress, wethAddress);
      const receipt = await tx.wait();

      // Check pair was created
      expect(await dexFactory.allPairsLength()).to.equal(1);
      
      const pairAddress = await dexFactory.getPair(intuitAddress, wethAddress);
      expect(pairAddress).to.not.equal(ethers.ZeroAddress);

      // Check reverse mapping
      const reversePairAddress = await dexFactory.getPair(wethAddress, intuitAddress);
      expect(pairAddress).to.equal(reversePairAddress);

      // Check event emission
      expect(tx).to.emit(dexFactory, "PairCreated");
    });

    it("Should fail when creating duplicate pair", async function () {
      const { dexFactory, intuitToken, wethToken } = await loadFixture(deployFactoryFixture);

      const intuitAddress = await intuitToken.getAddress();
      const wethAddress = await wethToken.getAddress();

      // Create pair first time
      await dexFactory.createPair(intuitAddress, wethAddress);

      // Try to create same pair again
      await expect(
        dexFactory.createPair(intuitAddress, wethAddress)
      ).to.be.revertedWith("DEXFactory: PAIR_EXISTS");

      // Try reverse order
      await expect(
        dexFactory.createPair(wethAddress, intuitAddress)
      ).to.be.revertedWith("DEXFactory: PAIR_EXISTS");
    });

    it("Should fail with identical addresses", async function () {
      const { dexFactory, intuitToken } = await loadFixture(deployFactoryFixture);

      const intuitAddress = await intuitToken.getAddress();

      await expect(
        dexFactory.createPair(intuitAddress, intuitAddress)
      ).to.be.revertedWith("DEXFactory: IDENTICAL_ADDRESSES");
    });

    it("Should fail with zero address", async function () {
      const { dexFactory, intuitToken } = await loadFixture(deployFactoryFixture);

      const intuitAddress = await intuitToken.getAddress();

      await expect(
        dexFactory.createPair(intuitAddress, ethers.ZeroAddress)
      ).to.be.revertedWith("DEXFactory: ZERO_ADDRESS");
    });

    it("Should predict pair address correctly", async function () {
      const { dexFactory, intuitToken, wethToken } = await loadFixture(deployFactoryFixture);

      const intuitAddress = await intuitToken.getAddress();
      const wethAddress = await wethToken.getAddress();

      // Predict pair address before creation
      const predictedAddress = await dexFactory.pairFor(intuitAddress, wethAddress);

      // Create pair
      await dexFactory.createPair(intuitAddress, wethAddress);

      // Check predicted address matches actual
      const actualAddress = await dexFactory.getPair(intuitAddress, wethAddress);
      expect(predictedAddress).to.equal(actualAddress);
    });
  });

  describe("Fee Management", function () {
    it("Should set fee recipient", async function () {
      const { dexFactory, deployer, user1 } = await loadFixture(deployFactoryFixture);

      await dexFactory.setFeeTo(user1.address);
      expect(await dexFactory.feeTo()).to.equal(user1.address);
    });

    it("Should fail to set fee recipient from non-setter", async function () {
      const { dexFactory, user1, user2 } = await loadFixture(deployFactoryFixture);

      await expect(
        dexFactory.connect(user1).setFeeTo(user2.address)
      ).to.be.revertedWith("DEXFactory: FORBIDDEN");
    });

    it("Should transfer fee setter role", async function () {
      const { dexFactory, deployer, user1, user2 } = await loadFixture(deployFactoryFixture);

      // Transfer setter role to user1
      await dexFactory.setFeeToSetter(user1.address);
      expect(await dexFactory.feeToSetter()).to.equal(user1.address);

      // Old setter should no longer work
      await expect(
        dexFactory.setFeeTo(user2.address)
      ).to.be.revertedWith("DEXFactory: FORBIDDEN");

      // New setter should work
      await dexFactory.connect(user1).setFeeTo(user2.address);
      expect(await dexFactory.feeTo()).to.equal(user2.address);
    });
  });

  describe("Multiple Pairs", function () {
    it("Should handle multiple pairs correctly", async function () {
      const { dexFactory, intuitToken, wethToken, deployer } = await loadFixture(deployFactoryFixture);

      // Deploy another token
      const TokenFactory = await ethers.getContractFactory("Intuit");
      const token2 = await TokenFactory.deploy();

      const intuitAddress = await intuitToken.getAddress();
      const wethAddress = await wethToken.getAddress();
      const token2Address = await token2.getAddress();

      // Create multiple pairs
      await dexFactory.createPair(intuitAddress, wethAddress);
      await dexFactory.createPair(intuitAddress, token2Address);
      await dexFactory.createPair(wethAddress, token2Address);

      expect(await dexFactory.allPairsLength()).to.equal(3);

      // Each pair should have correct address
      const pair1 = await dexFactory.getPair(intuitAddress, wethAddress);
      const pair2 = await dexFactory.getPair(intuitAddress, token2Address);
      const pair3 = await dexFactory.getPair(wethAddress, token2Address);

      expect(pair1).to.not.equal(ethers.ZeroAddress);
      expect(pair2).to.not.equal(ethers.ZeroAddress);
      expect(pair3).to.not.equal(ethers.ZeroAddress);
      
      // All pairs should be different
      expect(pair1).to.not.equal(pair2);
      expect(pair1).to.not.equal(pair3);
      expect(pair2).to.not.equal(pair3);
    });
  });
});