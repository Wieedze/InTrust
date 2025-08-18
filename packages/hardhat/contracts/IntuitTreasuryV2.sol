// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "./Intuit.sol";

/**
 * @title IntuitTreasuryV2
 * @dev Treasury contract to hold and manage INTUIT token reserves
 * Professional token management with time-locks and governance
 */
contract IntuitTreasuryV2 {
    
    /* ========== STATE VARIABLES ========== */
    
    Intuit public immutable intuitToken;
    address public owner;
    address public pendingOwner;
    
    uint256 public constant TOTAL_ALLOCATION = 850_000 * 10**18; // 85% of 1M supply
    uint256 public releasedAmount;
    uint256 public deploymentTime;
    
    // Vesting schedule
    uint256 public constant CLIFF_DURATION = 180 days; // 6 months cliff
    uint256 public constant VESTING_DURATION = 4 * 365 days; // 4 years total vesting
    
    /* ========== EVENTS ========== */
    
    event TokensReleased(address indexed to, uint256 amount);
    event OwnershipTransferInitiated(address indexed currentOwner, address indexed newOwner);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    event EmergencyWithdraw(address indexed to, uint256 amount);
    
    /* ========== MODIFIERS ========== */
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Treasury: caller is not the owner");
        _;
    }
    
    /* ========== CONSTRUCTOR ========== */
    
    constructor(address _intuitToken) {
        require(_intuitToken != address(0), "Treasury: invalid token address");
        intuitToken = Intuit(_intuitToken);
        owner = msg.sender;
        deploymentTime = block.timestamp;
    }
    
    /* ========== VIEW FUNCTIONS ========== */
    
    /**
     * @dev Calculate how many tokens are available for release
     */
    function getReleasableAmount() public view returns (uint256) {
        if (block.timestamp < deploymentTime + CLIFF_DURATION) {
            return 0; // Still in cliff period
        }
        
        uint256 timeElapsed = block.timestamp - deploymentTime;
        if (timeElapsed >= VESTING_DURATION) {
            return TOTAL_ALLOCATION - releasedAmount; // Fully vested
        }
        
        uint256 vestedAmount = (TOTAL_ALLOCATION * timeElapsed) / VESTING_DURATION;
        return vestedAmount - releasedAmount;
    }
    
    /**
     * @dev Get current treasury balance
     */
    function getTreasuryBalance() external view returns (uint256) {
        return intuitToken.balanceOf(address(this));
    }
    
    /**
     * @dev Get vesting information
     */
    function getVestingInfo() external view returns (
        uint256 totalAllocation,
        uint256 released,
        uint256 releasable,
        uint256 cliffEnd,
        uint256 vestingEnd
    ) {
        return (
            TOTAL_ALLOCATION,
            releasedAmount,
            getReleasableAmount(),
            deploymentTime + CLIFF_DURATION,
            deploymentTime + VESTING_DURATION
        );
    }
    
    /* ========== MAIN FUNCTIONS ========== */
    
    /**
     * @dev Release vested tokens to owner
     */
    function releaseTokens() external onlyOwner {
        uint256 releasableAmount = getReleasableAmount();
        require(releasableAmount > 0, "Treasury: no tokens to release");
        
        releasedAmount += releasableAmount;
        require(intuitToken.transfer(owner, releasableAmount), "Treasury: transfer failed");
        
        emit TokensReleased(owner, releasableAmount);
    }
    
    /**
     * @dev Release specific amount of vested tokens
     */
    function releaseTokens(uint256 amount) external onlyOwner {
        uint256 releasableAmount = getReleasableAmount();
        require(amount <= releasableAmount, "Treasury: amount exceeds releasable");
        require(amount > 0, "Treasury: amount must be greater than 0");
        
        releasedAmount += amount;
        require(intuitToken.transfer(owner, amount), "Treasury: transfer failed");
        
        emit TokensReleased(owner, amount);
    }
    
    /* ========== GOVERNANCE FUNCTIONS ========== */
    
    /**
     * @dev Initiate ownership transfer (2-step process)
     */
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Treasury: new owner is the zero address");
        require(newOwner != owner, "Treasury: new owner is the current owner");
        
        pendingOwner = newOwner;
        emit OwnershipTransferInitiated(owner, newOwner);
    }
    
    /**
     * @dev Accept ownership transfer
     */
    function acceptOwnership() external {
        require(msg.sender == pendingOwner, "Treasury: caller is not the pending owner");
        
        address previousOwner = owner;
        owner = pendingOwner;
        pendingOwner = address(0);
        
        emit OwnershipTransferred(previousOwner, owner);
    }
    
    /* ========== EMERGENCY FUNCTIONS ========== */
    
    /**
     * @dev Emergency withdraw - only after vesting period ends
     * This is a safety mechanism in case of contract issues
     */
    function emergencyWithdraw() external onlyOwner {
        require(
            block.timestamp >= deploymentTime + VESTING_DURATION,
            "Treasury: emergency withdraw only after vesting ends"
        );
        
        uint256 balance = intuitToken.balanceOf(address(this));
        require(balance > 0, "Treasury: no tokens to withdraw");
        
        require(intuitToken.transfer(owner, balance), "Treasury: emergency transfer failed");
        emit EmergencyWithdraw(owner, balance);
    }
}
