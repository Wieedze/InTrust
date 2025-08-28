// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title INTUIT Faucet
 * @dev Allows users to claim free INTUIT tokens for testing
 */
contract IntuitFaucet is Ownable {
    
    /* ========== STATE VARIABLES ========== */
    
    IERC20 public immutable intuitToken;
    uint256 public claimAmount = 1000 * 10**18; // 1000 INTUIT per claim
    uint256 public cooldownPeriod = 24 hours; // 24h between claims
    
    mapping(address => uint256) public lastClaimTime;
    
    /* ========== EVENTS ========== */
    
    event TokensClaimed(address indexed user, uint256 amount);
    event ClaimAmountUpdated(uint256 newAmount);
    event CooldownUpdated(uint256 newCooldown);
    event FaucetFunded(uint256 amount);
    
    /* ========== CONSTRUCTOR ========== */
    
    constructor(address _intuitToken) Ownable(msg.sender) {
        intuitToken = IERC20(_intuitToken);
    }
    
    /* ========== PUBLIC FUNCTIONS ========== */
    
    /**
     * @dev Claim free INTUIT tokens
     */
    function claimTokens() external {
        require(canClaim(msg.sender), "Faucet: Still in cooldown period");
        require(intuitToken.balanceOf(address(this)) >= claimAmount, "Faucet: Insufficient balance");
        
        lastClaimTime[msg.sender] = block.timestamp;
        
        require(intuitToken.transfer(msg.sender, claimAmount), "Faucet: Transfer failed");
        
        emit TokensClaimed(msg.sender, claimAmount);
    }
    
    /**
     * @dev Check if user can claim tokens
     */
    function canClaim(address user) public view returns (bool) {
        return block.timestamp >= lastClaimTime[user] + cooldownPeriod;
    }
    
    /**
     * @dev Get time until next claim
     */
    function timeUntilNextClaim(address user) external view returns (uint256) {
        if (canClaim(user)) return 0;
        return (lastClaimTime[user] + cooldownPeriod) - block.timestamp;
    }
    
    /**
     * @dev Get faucet balance
     */
    function getFaucetBalance() external view returns (uint256) {
        return intuitToken.balanceOf(address(this));
    }
    
    /* ========== OWNER FUNCTIONS ========== */
    
    /**
     * @dev Update claim amount
     */
    function updateClaimAmount(uint256 _newAmount) external onlyOwner {
        claimAmount = _newAmount;
        emit ClaimAmountUpdated(_newAmount);
    }
    
    /**
     * @dev Update cooldown period
     */
    function updateCooldown(uint256 _newCooldown) external onlyOwner {
        cooldownPeriod = _newCooldown;
        emit CooldownUpdated(_newCooldown);
    }
    
    /**
     * @dev Fund the faucet with tokens
     */
    function fundFaucet(uint256 amount) external onlyOwner {
        require(intuitToken.transferFrom(msg.sender, address(this), amount), "Faucet: Transfer failed");
        emit FaucetFunded(amount);
    }
    
    /**
     * @dev Emergency withdraw (owner only)
     */
    function emergencyWithdraw() external onlyOwner {
        uint256 balance = intuitToken.balanceOf(address(this));
        require(intuitToken.transfer(owner(), balance), "Faucet: Transfer failed");
    }
}