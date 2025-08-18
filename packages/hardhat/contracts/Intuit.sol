// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @title INTUIT Token
 * @dev Professional ERC20 token with 1M fixed supply
 * Native-style token for INTUITION Network DEX
 */
contract Intuit is ERC20 {
    
    /* ========== STATE VARIABLES ========== */
    
    uint256 public constant TOTAL_SUPPLY = 1_000_000 * 10**18; // 1M tokens
    
    /* ========== EVENTS ========== */
    
    event TokensDeployed(address indexed deployer, uint256 totalSupply);
    
    /* ========== CONSTRUCTOR ========== */
    
    constructor() ERC20("INTUIT", "INTUIT") {
        // Mint 1M tokens to deployer
        _mint(msg.sender, TOTAL_SUPPLY);
        emit TokensDeployed(msg.sender, TOTAL_SUPPLY);
    }
    
    /* ========== VIEW FUNCTIONS ========== */
    
    /**
     * @dev Returns the total supply constant
     */
    function getTotalSupply() external pure returns (uint256) {
        return TOTAL_SUPPLY;
    }
    
    /**
     * @dev Returns token information
     */
    function getTokenInfo() external pure returns (
        string memory tokenName,
        string memory tokenSymbol,
        uint256 tokenSupply,
        uint8 tokenDecimals
    ) {
        return ("INTUIT", "INTUIT", TOTAL_SUPPLY, 18);
    }
}
