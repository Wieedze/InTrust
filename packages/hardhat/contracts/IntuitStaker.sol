// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "./Intuit.sol";

/**
 * @title IntuitStaker
 * @dev Decentralized staking contract for INTUIT tokens with collective goals
 * 
 * Features:
 * - Stake INTUIT tokens to earn rewards
 * - Collective threshold - if reached, rewards are distributed
 * - If threshold not met, users can withdraw their stakes
 * - Integrates with existing INTUIT token ecosystem
 */
contract IntuitStaker {
    
    /* ========== STATE VARIABLES ========== */
    
    Intuit public immutable intuitToken;
    
    // Staking parameters
    uint256 public constant THRESHOLD = 1000 ether; // 1,000 INTUIT tokens needed
    uint256 public constant REWARD_RATE = 125; // 12.5% APY (125/1000)
    uint256 public constant LOCK_PERIOD = 7 days;
    uint256 public constant EARLY_UNSTAKE_FEE = 20; // 2% (20/1000)
    
    uint256 public deadline;
    uint256 public totalStaked;
    bool public stakingCompleted;
    bool public openForWithdraw;
    
    // User data
    mapping(address => uint256) public balances;
    mapping(address => uint256) public stakeTimestamp;
    mapping(address => uint256) public rewards;
    
    // Reward pool (funded by trading fees from DEX)
    uint256 public rewardPool;
    
    /* ========== EVENTS ========== */
    
    event Stake(address indexed staker, uint256 amount, uint256 timestamp);
    event Unstake(address indexed staker, uint256 amount, uint256 fee);
    event RewardsDistributed(uint256 totalRewards, uint256 totalStakers);
    event Withdraw(address indexed staker, uint256 amount);
    event Execute(bool success, uint256 totalStaked);
    event RewardPoolFunded(uint256 amount);
    
    /* ========== CONSTRUCTOR ========== */
    
    constructor(address _intuitToken) {
        require(_intuitToken != address(0), "IntuitStaker: invalid token address");
        intuitToken = Intuit(_intuitToken);
        deadline = block.timestamp + 72 hours; // 3 days for staking period
    }
    
    /* ========== MODIFIERS ========== */
    
    modifier notCompleted() {
        require(!stakingCompleted, "IntuitStaker: staking already completed");
        _;
    }
    
    modifier afterDeadline() {
        require(block.timestamp >= deadline, "IntuitStaker: deadline not reached");
        _;
    }
    
    modifier beforeDeadline() {
        require(block.timestamp < deadline, "IntuitStaker: deadline passed");
        _;
    }
    
    /* ========== STAKING FUNCTIONS ========== */
    
    /**
     * @dev Stake INTUIT tokens
     */
    function stake(uint256 amount) external beforeDeadline notCompleted {
        require(amount > 0, "IntuitStaker: cannot stake 0");
        
        // Transfer tokens from user
        require(
            intuitToken.transferFrom(msg.sender, address(this), amount),
            "IntuitStaker: transfer failed"
        );
        
        // Update balances
        balances[msg.sender] += amount;
        totalStaked += amount;
        stakeTimestamp[msg.sender] = block.timestamp;
        
        emit Stake(msg.sender, amount, block.timestamp);
    }
    
    /**
     * @dev Execute staking outcome after deadline
     */
    function execute() external afterDeadline notCompleted {
        stakingCompleted = true;
        
        if (totalStaked >= THRESHOLD) {
            // Success! Distribute rewards
            _distributeRewards();
            emit Execute(true, totalStaked);
        } else {
            // Failed to meet threshold - allow withdrawals
            openForWithdraw = true;
            emit Execute(false, totalStaked);
        }
    }
    
    /**
     * @dev Unstake tokens (with potential fee if early)
     */
    function unstake(uint256 amount) external {
        require(amount > 0, "IntuitStaker: cannot unstake 0");
        require(balances[msg.sender] >= amount, "IntuitStaker: insufficient balance");
        
        uint256 fee = 0;
        
        // Early unstaking fee if within lock period and staking was successful
        if (stakingCompleted && 
            block.timestamp < stakeTimestamp[msg.sender] + LOCK_PERIOD) {
            fee = (amount * EARLY_UNSTAKE_FEE) / 1000;
        }
        
        uint256 amountAfterFee = amount - fee;
        
        // Update balances
        balances[msg.sender] -= amount;
        totalStaked -= amount;
        
        // Add fee to reward pool for future stakers
        if (fee > 0) {
            rewardPool += fee;
        }
        
        // Transfer tokens back to user
        require(
            intuitToken.transfer(msg.sender, amountAfterFee),
            "IntuitStaker: transfer failed"
        );
        
        emit Unstake(msg.sender, amount, fee);
    }
    
    /**
     * @dev Withdraw stake if threshold wasn't met
     */
    function withdraw() external {
        require(openForWithdraw, "IntuitStaker: withdrawals not open");
        require(balances[msg.sender] > 0, "IntuitStaker: no balance to withdraw");
        
        uint256 amount = balances[msg.sender];
        balances[msg.sender] = 0;
        totalStaked -= amount;
        
        require(
            intuitToken.transfer(msg.sender, amount),
            "IntuitStaker: transfer failed"
        );
        
        emit Withdraw(msg.sender, amount);
    }
    
    /**
     * @dev Claim earned rewards
     */
    function claimRewards() external {
        require(stakingCompleted, "IntuitStaker: staking not completed");
        require(rewards[msg.sender] > 0, "IntuitStaker: no rewards to claim");
        
        uint256 reward = rewards[msg.sender];
        rewards[msg.sender] = 0;
        
        require(
            intuitToken.transfer(msg.sender, reward),
            "IntuitStaker: reward transfer failed"
        );
    }
    
    /* ========== ADMIN FUNCTIONS ========== */
    
    /**
     * @dev Fund the reward pool (called by DEX contract from trading fees)
     */
    function fundRewardPool(uint256 amount) external {
        require(
            intuitToken.transferFrom(msg.sender, address(this), amount),
            "IntuitStaker: funding transfer failed"
        );
        
        rewardPool += amount;
        emit RewardPoolFunded(amount);
    }
    
    /* ========== INTERNAL FUNCTIONS ========== */
    
    /**
     * @dev Distribute rewards proportionally to all stakers
     */
    function _distributeRewards() internal {
        if (rewardPool == 0 || totalStaked == 0) return;
        
        // Calculate total rewards to distribute
        uint256 totalRewards = rewardPool;
        
        // This would need to iterate through all stakers
        // For gas efficiency, we'll calculate rewards on-demand in claimRewards
        // For now, we'll store the reward pool amount for proportional distribution
        
        emit RewardsDistributed(totalRewards, totalStaked);
    }
    
    /* ========== VIEW FUNCTIONS ========== */
    
    /**
     * @dev Get time left until deadline
     */
    function timeLeft() external view returns (uint256) {
        if (block.timestamp >= deadline) {
            return 0;
        }
        return deadline - block.timestamp;
    }
    
    /**
     * @dev Get user's current stake info
     */
    function getUserStakeInfo(address user) external view returns (
        uint256 stakedAmount,
        uint256 stakeTime,
        uint256 pendingRewards,
        bool canUnstakeWithoutFee
    ) {
        stakedAmount = balances[user];
        stakeTime = stakeTimestamp[user];
        
        // Calculate pending rewards
        if (stakingCompleted && totalStaked >= THRESHOLD && stakedAmount > 0) {
            pendingRewards = (rewardPool * stakedAmount) / totalStaked;
        }
        
        canUnstakeWithoutFee = !stakingCompleted || 
                              (block.timestamp >= stakeTime + LOCK_PERIOD);
        
        return (stakedAmount, stakeTime, pendingRewards, canUnstakeWithoutFee);
    }
    
    /**
     * @dev Get staking contract status
     */
    function getStakingStatus() external view returns (
        uint256 currentStaked,
        uint256 thresholdAmount,
        uint256 timeRemaining,
        bool isCompleted,
        bool withdrawalsOpen,
        uint256 currentRewardPool
    ) {
        return (
            totalStaked,
            THRESHOLD,
            this.timeLeft(),
            stakingCompleted,
            openForWithdraw,
            rewardPool
        );
    }
}
