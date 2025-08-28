// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./TransactionLimits.sol";

/**
 * @title IntuitStaking
 * @dev Simple staking contract for INTUIT token only
 * Users stake INTUIT and earn INTUIT rewards
 */
contract IntuitStaking is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    struct UserInfo {
        uint256 stakedAmount;      // Amount of INTUIT staked
        uint256 stakeTime;         // When user staked
        uint256 lastRewardTime;    // Last time rewards were calculated
        uint256 pendingRewards;    // Accumulated rewards not yet claimed
    }

    // INTUIT token contract
    IERC20 public intuitToken;
    TransactionLimits public transactionLimits;
    
    // Staking parameters
    uint256 public rewardRate;          // INTUIT rewards per second per INTUIT staked (18 decimals)
    uint256 public minStakeAmount;      // Minimum amount to stake
    uint256 public totalStaked;         // Total INTUIT staked in contract
    uint256 public rewardPool;          // Total INTUIT available for rewards
    
    // User info mapping
    mapping(address => UserInfo) public userInfo;
    
    // Events
    event Staked(address indexed user, uint256 amount);
    event Unstaked(address indexed user, uint256 amount);
    event RewardsClaimed(address indexed user, uint256 amount);
    event RewardRateUpdated(uint256 oldRate, uint256 newRate);
    event RewardPoolFunded(uint256 amount);

    constructor(
        address _intuitToken,
        uint256 _rewardRate,
        uint256 _minStakeAmount
    ) Ownable(msg.sender) {
        require(_intuitToken != address(0), "Invalid token address");
        
        intuitToken = IERC20(_intuitToken);
        rewardRate = _rewardRate;
        minStakeAmount = _minStakeAmount;
    }
    
    function setTransactionLimits(address _transactionLimits) external onlyOwner {
        transactionLimits = TransactionLimits(_transactionLimits);
    }

    /**
     * @dev Stake INTUIT tokens
     */
    function stake(uint256 _amount) external nonReentrant {
        require(_amount >= minStakeAmount, "Amount below minimum");
        require(_amount > 0, "Cannot stake 0 tokens");

        // Check transaction limits if available
        if (address(transactionLimits) != address(0)) {
            transactionLimits.checkStakeLimits(msg.sender, _amount);
        }

        UserInfo storage user = userInfo[msg.sender];
        
        // Update pending rewards before changing stake
        _updateRewards(msg.sender);
        
        // Transfer tokens from user to contract
        intuitToken.safeTransferFrom(msg.sender, address(this), _amount);
        
        // Update user and global state
        user.stakedAmount += _amount;
        user.stakeTime = block.timestamp;
        user.lastRewardTime = block.timestamp;
        totalStaked += _amount;

        emit Staked(msg.sender, _amount);
    }

    /**
     * @dev Unstake INTUIT tokens
     */
    function unstake(uint256 _amount) external nonReentrant {
        UserInfo storage user = userInfo[msg.sender];
        require(user.stakedAmount >= _amount, "Insufficient staked amount");
        require(_amount > 0, "Cannot unstake 0 tokens");

        // Update pending rewards before changing stake
        _updateRewards(msg.sender);
        
        // Update user and global state
        user.stakedAmount -= _amount;
        totalStaked -= _amount;
        
        // If user unstaked everything, reset stake time
        if (user.stakedAmount == 0) {
            user.stakeTime = 0;
        }

        // Transfer tokens back to user
        intuitToken.safeTransfer(msg.sender, _amount);

        emit Unstaked(msg.sender, _amount);
    }

    /**
     * @dev Claim accumulated rewards
     */
    function claimRewards() external nonReentrant {
        _updateRewards(msg.sender);
        
        UserInfo storage user = userInfo[msg.sender];
        uint256 rewards = user.pendingRewards;
        require(rewards > 0, "No rewards to claim");
        require(rewardPool >= rewards, "Insufficient reward pool");

        // Reset pending rewards
        user.pendingRewards = 0;
        
        // Update reward pool
        rewardPool -= rewards;

        // Transfer reward tokens to user
        intuitToken.safeTransfer(msg.sender, rewards);

        emit RewardsClaimed(msg.sender, rewards);
    }

    /**
     * @dev Calculate pending rewards for a user
     */
    function calculatePendingRewards(address _user) public view returns (uint256) {
        UserInfo memory user = userInfo[_user];
        if (user.stakedAmount == 0) {
            return user.pendingRewards;
        }

        uint256 timeElapsed = block.timestamp - user.lastRewardTime;
        uint256 newRewards = (user.stakedAmount * rewardRate * timeElapsed) / 1e18;
        
        return user.pendingRewards + newRewards;
    }

    /**
     * @dev Get user staking info
     */
    function getUserInfo(address _user) external view returns (
        uint256 stakedAmount,
        uint256 pendingRewards,
        uint256 stakeTime,
        uint256 stakingDays
    ) {
        UserInfo memory user = userInfo[_user];
        uint256 stakingTime = user.stakeTime > 0 ? block.timestamp - user.stakeTime : 0;
        
        return (
            user.stakedAmount,
            calculatePendingRewards(_user),
            user.stakeTime,
            stakingTime / 86400  // Convert to days
        );
    }

    /**
     * @dev Internal function to update user rewards
     */
    function _updateRewards(address _user) internal {
        UserInfo storage user = userInfo[_user];
        if (user.stakedAmount == 0) return;

        uint256 timeElapsed = block.timestamp - user.lastRewardTime;
        if (timeElapsed == 0) return;

        uint256 newRewards = (user.stakedAmount * rewardRate * timeElapsed) / 1e18;
        user.pendingRewards += newRewards;
        user.lastRewardTime = block.timestamp;
    }

    /**
     * @dev Owner functions
     */
    
    /**
     * @dev Fund the reward pool with INTUIT tokens
     */
    function fundRewardPool(uint256 _amount) external onlyOwner {
        require(_amount > 0, "Amount must be greater than 0");
        
        intuitToken.safeTransferFrom(msg.sender, address(this), _amount);
        rewardPool += _amount;
        
        emit RewardPoolFunded(_amount);
    }

    /**
     * @dev Update reward rate (owner only)
     */
    function updateRewardRate(uint256 _newRewardRate) external onlyOwner {
        uint256 oldRate = rewardRate;
        rewardRate = _newRewardRate;
        emit RewardRateUpdated(oldRate, _newRewardRate);
    }

    /**
     * @dev Update minimum stake amount (owner only)
     */
    function updateMinStakeAmount(uint256 _newMinStakeAmount) external onlyOwner {
        minStakeAmount = _newMinStakeAmount;
    }

    /**
     * @dev Emergency withdraw function (owner only)
     */
    function emergencyWithdraw(uint256 _amount) external onlyOwner {
        intuitToken.safeTransfer(owner(), _amount);
    }

    /**
     * @dev Get contract info
     */
    function getContractInfo() external view returns (
        uint256 _totalStaked,
        uint256 _rewardPool,
        uint256 _rewardRate,
        uint256 _minStakeAmount,
        address _intuitToken
    ) {
        return (
            totalStaked,
            rewardPool,
            rewardRate,
            minStakeAmount,
            address(intuitToken)
        );
    }
}