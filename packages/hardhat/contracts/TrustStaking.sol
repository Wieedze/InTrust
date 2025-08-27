// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title TrustStaking - Native TRUST Token Staking
 * @dev Users stake native TRUST tokens and earn INTUIT rewards
 */
contract TrustStaking is ReentrancyGuard, Ownable {
    
    IERC20 public rewardToken; // INTUIT token for rewards
    
    uint256 public rewardRate = 0.001 ether; // 0.1% per second
    uint256 public minimumStake = 1 ether; // 1 TRUST minimum
    uint256 public totalStaked;
    uint256 public rewardPool;
    
    struct UserStake {
        uint256 amount;
        uint256 rewardDebt;
        uint256 lastStakeTime;
    }
    
    mapping(address => UserStake) public userStakes;
    
    event Staked(address indexed user, uint256 amount);
    event Unstaked(address indexed user, uint256 amount);
    event RewardsClaimed(address indexed user, uint256 reward);
    event RewardPoolFunded(uint256 amount);
    
    constructor(address _rewardToken) Ownable(msg.sender) {
        rewardToken = IERC20(_rewardToken);
    }
    
    // Stake native TRUST tokens
    function stake() external payable nonReentrant {
        require(msg.value >= minimumStake, "Below minimum stake");
        
        UserStake storage userStake = userStakes[msg.sender];
        
        // Claim pending rewards first
        if (userStake.amount > 0) {
            _claimRewards(msg.sender);
        }
        
        userStake.amount += msg.value;
        userStake.lastStakeTime = block.timestamp;
        totalStaked += msg.value;
        
        emit Staked(msg.sender, msg.value);
    }
    
    // Unstake TRUST tokens
    function unstake(uint256 amount) external nonReentrant {
        UserStake storage userStake = userStakes[msg.sender];
        require(userStake.amount >= amount, "Insufficient stake");
        
        // Claim pending rewards first
        _claimRewards(msg.sender);
        
        userStake.amount -= amount;
        totalStaked -= amount;
        
        // Send TRUST back to user
        payable(msg.sender).transfer(amount);
        
        emit Unstaked(msg.sender, amount);
    }
    
    // Claim INTUIT rewards
    function claimRewards() external nonReentrant {
        _claimRewards(msg.sender);
    }
    
    // Internal function to handle reward claiming
    function _claimRewards(address user) internal {
        UserStake storage userStake = userStakes[user];
        if (userStake.amount == 0) return;
        
        uint256 pendingRewards = calculatePendingRewards(user);
        if (pendingRewards > 0 && rewardPool >= pendingRewards) {
            rewardPool -= pendingRewards;
            userStake.rewardDebt += pendingRewards;
            userStake.lastStakeTime = block.timestamp;
            
            rewardToken.transfer(user, pendingRewards);
            emit RewardsClaimed(user, pendingRewards);
        }
    }
    
    // Calculate pending rewards for a user
    function calculatePendingRewards(address user) public view returns (uint256) {
        UserStake memory userStake = userStakes[user];
        if (userStake.amount == 0) return 0;
        
        uint256 timeStaked = block.timestamp - userStake.lastStakeTime;
        return (userStake.amount * rewardRate * timeStaked) / 1 ether;
    }
    
    // Get user stake info
    function getUserStake(address user) external view returns (uint256 amount, uint256 pendingRewards) {
        UserStake memory userStake = userStakes[user];
        amount = userStake.amount;
        pendingRewards = calculatePendingRewards(user);
    }
    
    // Owner functions
    function fundRewardPool(uint256 amount) external onlyOwner {
        rewardToken.transferFrom(msg.sender, address(this), amount);
        rewardPool += amount;
        emit RewardPoolFunded(amount);
    }
    
    function setRewardRate(uint256 newRate) external onlyOwner {
        rewardRate = newRate;
    }
    
    function setMinimumStake(uint256 newMinimum) external onlyOwner {
        minimumStake = newMinimum;
    }
    
    // Emergency withdrawal by owner
    function emergencyWithdraw() external onlyOwner {
        payable(owner()).transfer(address(this).balance);
        if (rewardPool > 0) {
            rewardToken.transfer(owner(), rewardPool);
        }
    }
    
    receive() external payable {
        // Allow contract to receive ETH/TRUST
    }
}