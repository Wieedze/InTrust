// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "./Intuit.sol";

/**
 * @title IntuitDEX
 * @dev Decentralized Exchange for TTRUST ↔ INTUIT trading
 * Uses constant product AMM formula with 0.3% fee
 */
contract IntuitDEX {
    
    /* ========== STATE VARIABLES ========== */
    
    Intuit public immutable intuitToken;
    
    uint256 public totalLiquidity;
    mapping(address => uint256) public liquidity;
    
    // Fee: 0.3% (3/1000)
    uint256 public constant FEE_NUMERATOR = 3;
    uint256 public constant FEE_DENOMINATOR = 1000;
    
    /* ========== EVENTS ========== */
    
    event TtrustToIntuitSwap(address indexed swapper, uint256 ttrustInput, uint256 intuitOutput);
    event IntuitToTtrustSwap(address indexed swapper, uint256 intuitInput, uint256 ttrustOutput);
    event LiquidityAdded(address indexed provider, uint256 ttrustAmount, uint256 intuitAmount, uint256 liquidityMinted);
    event LiquidityRemoved(address indexed provider, uint256 ttrustAmount, uint256 intuitAmount, uint256 liquidityBurned);
    
    /* ========== CONSTRUCTOR ========== */
    
    constructor(address _intuitToken) {
        require(_intuitToken != address(0), "DEX: invalid token address");
        intuitToken = Intuit(_intuitToken);
    }
    
    /* ========== INITIALIZATION ========== */
    
    /**
     * @dev Initialize DEX with 1:1 ratio
     * @param intuitAmount Amount of INTUIT tokens to add
     */
    function init(uint256 intuitAmount) public payable returns (uint256) {
        require(totalLiquidity == 0, "DEX: already initialized");
        require(msg.value > 0, "DEX: must send TTRUST");
        require(intuitAmount > 0, "DEX: must provide INTUIT");
        
        // Transfer INTUIT tokens from sender
        require(
            intuitToken.transferFrom(msg.sender, address(this), intuitAmount),
            "DEX: INTUIT transfer failed"
        );
        
        // Initial liquidity = sqrt(ttrust * intuit)
        uint256 initialLiquidity = sqrt(msg.value * intuitAmount);
        totalLiquidity = initialLiquidity;
        liquidity[msg.sender] = initialLiquidity;
        
        emit LiquidityAdded(msg.sender, msg.value, intuitAmount, initialLiquidity);
        return initialLiquidity;
    }
    
    /* ========== SWAP FUNCTIONS ========== */
    
    /**
     * @dev Swap TTRUST for INTUIT
     */
    function swapTtrustForIntuit() public payable returns (uint256) {
        require(msg.value > 0, "DEX: cannot swap 0 TTRUST");
        require(totalLiquidity > 0, "DEX: not initialized");
        
        uint256 ttrustReserve = address(this).balance - msg.value;
        uint256 intuitReserve = intuitToken.balanceOf(address(this));
        
        uint256 intuitOutput = getAmountOut(msg.value, ttrustReserve, intuitReserve);
        require(intuitOutput > 0, "DEX: insufficient output amount");
        
        require(intuitToken.transfer(msg.sender, intuitOutput), "DEX: INTUIT transfer failed");
        
        emit TtrustToIntuitSwap(msg.sender, msg.value, intuitOutput);
        return intuitOutput;
    }
    
    /**
     * @dev Swap INTUIT for TTRUST
     */
    function swapIntuitForTtrust(uint256 intuitAmount) public returns (uint256) {
        require(intuitAmount > 0, "DEX: cannot swap 0 INTUIT");
        require(totalLiquidity > 0, "DEX: not initialized");
        
        uint256 intuitReserve = intuitToken.balanceOf(address(this));
        uint256 ttrustReserve = address(this).balance;
        
        uint256 ttrustOutput = getAmountOut(intuitAmount, intuitReserve, ttrustReserve);
        require(ttrustOutput > 0, "DEX: insufficient output amount");
        require(ttrustOutput <= ttrustReserve, "DEX: insufficient TTRUST liquidity");
        
        require(
            intuitToken.transferFrom(msg.sender, address(this), intuitAmount),
            "DEX: INTUIT transfer failed"
        );
        
        (bool sent, ) = msg.sender.call{value: ttrustOutput}("");
        require(sent, "DEX: TTRUST transfer failed");
        
        emit IntuitToTtrustSwap(msg.sender, intuitAmount, ttrustOutput);
        return ttrustOutput;
    }
    
    /* ========== LIQUIDITY FUNCTIONS ========== */
    
    /**
     * @dev Add liquidity to the pool
     */
    function addLiquidity(uint256 intuitAmount) public payable returns (uint256) {
        require(totalLiquidity > 0, "DEX: use init() for first liquidity");
        require(msg.value > 0, "DEX: must send TTRUST");
        require(intuitAmount > 0, "DEX: must provide INTUIT");
        
        uint256 ttrustReserve = address(this).balance - msg.value;
        uint256 intuitReserve = intuitToken.balanceOf(address(this));
        
        // Calculate required INTUIT amount to maintain ratio
        uint256 requiredIntuit = (msg.value * intuitReserve) / ttrustReserve;
        require(intuitAmount >= requiredIntuit, "DEX: insufficient INTUIT amount");
        
        // Use only the required amount
        uint256 actualIntuit = requiredIntuit;
        
        require(
            intuitToken.transferFrom(msg.sender, address(this), actualIntuit),
            "DEX: INTUIT transfer failed"
        );
        
        // Mint liquidity tokens proportional to contribution
        uint256 liquidityMinted = (msg.value * totalLiquidity) / ttrustReserve;
        liquidity[msg.sender] += liquidityMinted;
        totalLiquidity += liquidityMinted;
        
        // Refund excess INTUIT if any
        if (intuitAmount > actualIntuit) {
            require(
                intuitToken.transfer(msg.sender, intuitAmount - actualIntuit),
                "DEX: INTUIT refund failed"
            );
        }
        
        emit LiquidityAdded(msg.sender, msg.value, actualIntuit, liquidityMinted);
        return liquidityMinted;
    }
    
    /**
     * @dev Remove liquidity from the pool
     */
    function removeLiquidity(uint256 liquidityAmount) public returns (uint256 ttrustAmount, uint256 intuitAmount) {
        require(liquidityAmount > 0, "DEX: cannot remove 0 liquidity");
        require(liquidity[msg.sender] >= liquidityAmount, "DEX: insufficient liquidity");
        
        uint256 ttrustReserve = address(this).balance;
        uint256 intuitReserve = intuitToken.balanceOf(address(this));
        
        ttrustAmount = (liquidityAmount * ttrustReserve) / totalLiquidity;
        intuitAmount = (liquidityAmount * intuitReserve) / totalLiquidity;
        
        liquidity[msg.sender] -= liquidityAmount;
        totalLiquidity -= liquidityAmount;
        
        (bool sent, ) = msg.sender.call{value: ttrustAmount}("");
        require(sent, "DEX: TTRUST transfer failed");
        
        require(intuitToken.transfer(msg.sender, intuitAmount), "DEX: INTUIT transfer failed");
        
        emit LiquidityRemoved(msg.sender, ttrustAmount, intuitAmount, liquidityAmount);
        return (ttrustAmount, intuitAmount);
    }
    
    /* ========== VIEW FUNCTIONS ========== */
    
    /**
     * @dev Calculate output amount with 0.3% fee
     */
    function getAmountOut(uint256 inputAmount, uint256 inputReserve, uint256 outputReserve) 
        public 
        pure 
        returns (uint256) 
    {
        require(inputAmount > 0, "DEX: insufficient input amount");
        require(inputReserve > 0 && outputReserve > 0, "DEX: insufficient liquidity");
        
        // Apply 0.3% fee
        uint256 inputAmountWithFee = inputAmount * (FEE_DENOMINATOR - FEE_NUMERATOR);
        uint256 numerator = inputAmountWithFee * outputReserve;
        uint256 denominator = (inputReserve * FEE_DENOMINATOR) + inputAmountWithFee;
        
        return numerator / denominator;
    }
    
    /**
     * @dev Get current reserves
     */
    function getReserves() external view returns (uint256 ttrustReserve, uint256 intuitReserve) {
        return (address(this).balance, intuitToken.balanceOf(address(this)));
    }
    
    /**
     * @dev Get user's liquidity
     */
    function getUserLiquidity(address user) external view returns (uint256) {
        return liquidity[user];
    }
    
    /* ========== INTERNAL FUNCTIONS ========== */
    
    /**
     * @dev Square root function using Babylonian method
     */
    function sqrt(uint256 x) internal pure returns (uint256) {
        if (x == 0) return 0;
        uint256 z = (x + 1) / 2;
        uint256 y = x;
        while (z < y) {
            y = z;
            z = (x / z + z) / 2;
        }
        return y;
    }
}
