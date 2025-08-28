// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./EmergencyPausable.sol";

/**
 * @title TransactionLimits
 * @dev Contract for managing transaction limits and rate limiting
 */
contract TransactionLimits is EmergencyPausable {
    
    struct UserLimits {
        uint256 dailySwapAmount;
        uint256 dailyStakeAmount;
        uint256 lastResetTime;
        uint256 dailyFaucetClaims;
    }
    
    // Global limits (in wei/tokens)
    uint256 public maxSingleSwapAmount = 10000 ether; // 10,000 TRUST/INTUIT max per swap
    uint256 public maxSingleStakeAmount = 50000 ether; // 50,000 tokens max per stake
    uint256 public maxDailySwapPerUser = 100000 ether; // 100,000 per user per day
    uint256 public maxDailyStakePerUser = 200000 ether; // 200,000 per user per day
    uint256 public maxFaucetClaimsPerDay = 3; // 3 claims max per day per user
    
    // Protocol-wide limits
    uint256 public maxDailyProtocolVolume = 1000000 ether; // 1M tokens daily protocol limit
    uint256 public currentDailyVolume;
    uint256 public lastVolumeReset;
    
    // Suspicious activity detection
    uint256 public suspiciousSwapThreshold = 50000 ether; // Flag swaps above this amount
    uint256 public maxSwapsPerBlock = 5; // Max swaps per user per block
    
    mapping(address => UserLimits) public userLimits;
    mapping(address => mapping(uint256 => uint256)) public userSwapsPerBlock; // user => block => count
    mapping(address => bool) public isWhitelisted; // Whitelist for higher limits
    mapping(address => bool) public isSuspicious; // Flagged accounts
    
    event LimitsUpdated(string limitType, uint256 oldValue, uint256 newValue);
    event SuspiciousActivity(address indexed user, string reason, uint256 amount);
    event UserFlagged(address indexed user, string reason);
    event UserWhitelisted(address indexed user, bool status);
    
    constructor() EmergencyPausable() {}
    
    modifier whenNotSuspicious(address user) {
        require(!isSuspicious[user], "TransactionLimits: Account flagged as suspicious");
        _;
    }
    
    modifier rateLimited(address user) {
        require(userSwapsPerBlock[user][block.number] < maxSwapsPerBlock, "TransactionLimits: Too many swaps per block");
        userSwapsPerBlock[user][block.number]++;
        _;
    }
    
    /**
     * @dev Check if swap is allowed and update limits
     */
    function checkSwapLimits(address user, uint256 amount) external whenNotPaused whenNotSuspicious(user) rateLimited(user) {
        _resetDailyLimitsIfNeeded();
        _resetUserLimitsIfNeeded(user);
        
        // Check single transaction limit (higher for whitelisted)
        uint256 singleLimit = isWhitelisted[user] ? maxSingleSwapAmount * 2 : maxSingleSwapAmount;
        require(amount <= singleLimit, "TransactionLimits: Amount exceeds single transaction limit");
        
        // Check daily user limit
        uint256 dailyLimit = isWhitelisted[user] ? maxDailySwapPerUser * 2 : maxDailySwapPerUser;
        require(userLimits[user].dailySwapAmount + amount <= dailyLimit, "TransactionLimits: Daily user limit exceeded");
        
        // Check protocol-wide daily limit
        require(currentDailyVolume + amount <= maxDailyProtocolVolume, "TransactionLimits: Daily protocol limit exceeded");
        
        // Flag suspicious activity
        if (amount >= suspiciousSwapThreshold && !isWhitelisted[user]) {
            emit SuspiciousActivity(user, "Large swap detected", amount);
        }
        
        // Update limits
        userLimits[user].dailySwapAmount += amount;
        currentDailyVolume += amount;
    }
    
    /**
     * @dev Check if stake is allowed and update limits
     */
    function checkStakeLimits(address user, uint256 amount) external whenNotPaused whenNotSuspicious(user) {
        _resetDailyLimitsIfNeeded();
        _resetUserLimitsIfNeeded(user);
        
        // Check single transaction limit
        uint256 singleLimit = isWhitelisted[user] ? maxSingleStakeAmount * 2 : maxSingleStakeAmount;
        require(amount <= singleLimit, "TransactionLimits: Amount exceeds single stake limit");
        
        // Check daily user limit
        uint256 dailyLimit = isWhitelisted[user] ? maxDailyStakePerUser * 2 : maxDailyStakePerUser;
        require(userLimits[user].dailyStakeAmount + amount <= dailyLimit, "TransactionLimits: Daily stake limit exceeded");
        
        // Update limits
        userLimits[user].dailyStakeAmount += amount;
    }
    
    /**
     * @dev Check if faucet claim is allowed
     */
    function checkFaucetLimits(address user) external whenNotPaused whenNotSuspicious(user) {
        _resetUserLimitsIfNeeded(user);
        
        require(userLimits[user].dailyFaucetClaims < maxFaucetClaimsPerDay, "TransactionLimits: Daily faucet limit exceeded");
        
        userLimits[user].dailyFaucetClaims++;
    }
    
    /**
     * @dev Reset daily limits if 24 hours have passed
     */
    function _resetDailyLimitsIfNeeded() internal {
        if (block.timestamp >= lastVolumeReset + 86400) {
            currentDailyVolume = 0;
            lastVolumeReset = block.timestamp;
        }
    }
    
    /**
     * @dev Reset user limits if 24 hours have passed
     */
    function _resetUserLimitsIfNeeded(address user) internal {
        if (block.timestamp >= userLimits[user].lastResetTime + 86400) {
            userLimits[user].dailySwapAmount = 0;
            userLimits[user].dailyStakeAmount = 0;
            userLimits[user].dailyFaucetClaims = 0;
            userLimits[user].lastResetTime = block.timestamp;
        }
    }
    
    /**
     * @dev Owner functions for limit management
     */
    
    function updateSwapLimits(uint256 _maxSingle, uint256 _maxDaily) external onlyOwner {
        emit LimitsUpdated("maxSingleSwap", maxSingleSwapAmount, _maxSingle);
        emit LimitsUpdated("maxDailySwap", maxDailySwapPerUser, _maxDaily);
        maxSingleSwapAmount = _maxSingle;
        maxDailySwapPerUser = _maxDaily;
    }
    
    function updateStakeLimits(uint256 _maxSingle, uint256 _maxDaily) external onlyOwner {
        emit LimitsUpdated("maxSingleStake", maxSingleStakeAmount, _maxSingle);
        emit LimitsUpdated("maxDailyStake", maxDailyStakePerUser, _maxDaily);
        maxSingleStakeAmount = _maxSingle;
        maxDailyStakePerUser = _maxDaily;
    }
    
    function updateProtocolLimit(uint256 _maxDailyVolume) external onlyOwner {
        emit LimitsUpdated("maxDailyProtocolVolume", maxDailyProtocolVolume, _maxDailyVolume);
        maxDailyProtocolVolume = _maxDailyVolume;
    }
    
    function updateSuspiciousThreshold(uint256 _threshold) external onlyOwner {
        emit LimitsUpdated("suspiciousSwapThreshold", suspiciousSwapThreshold, _threshold);
        suspiciousSwapThreshold = _threshold;
    }
    
    function setWhitelisted(address user, bool status) external onlyOwner {
        isWhitelisted[user] = status;
        emit UserWhitelisted(user, status);
    }
    
    function flagSuspicious(address user, bool status, string memory reason) external onlyOwner {
        isSuspicious[user] = status;
        if (status) {
            emit UserFlagged(user, reason);
        }
    }
    
    function emergencyResetLimits(address user) external onlyOwner {
        delete userLimits[user];
        delete isSuspicious[user];
    }
    
    /**
     * @dev View functions
     */
    
    function getUserLimits(address user) external view returns (
        uint256 dailySwapUsed,
        uint256 dailySwapAvailable,
        uint256 dailyStakeUsed,
        uint256 dailyStakeAvailable,
        uint256 faucetClaimsUsed,
        uint256 faucetClaimsAvailable,
        bool suspicious,
        bool whitelisted
    ) {
        UserLimits memory limits = userLimits[user];
        
        // Check if limits should be reset (view function, don't actually reset)
        bool shouldReset = block.timestamp >= limits.lastResetTime + 86400;
        
        return (
            shouldReset ? 0 : limits.dailySwapAmount,
            isWhitelisted[user] ? maxDailySwapPerUser * 2 : maxDailySwapPerUser,
            shouldReset ? 0 : limits.dailyStakeAmount,
            isWhitelisted[user] ? maxDailyStakePerUser * 2 : maxDailyStakePerUser,
            shouldReset ? 0 : limits.dailyFaucetClaims,
            maxFaucetClaimsPerDay,
            isSuspicious[user],
            isWhitelisted[user]
        );
    }
    
    function getProtocolLimits() external view returns (
        uint256 dailyVolumeUsed,
        uint256 dailyVolumeLimit,
        uint256 hoursUntilReset
    ) {
        bool shouldReset = block.timestamp >= lastVolumeReset + 86400;
        uint256 timeLeft = shouldReset ? 0 : (lastVolumeReset + 86400 - block.timestamp);
        
        return (
            shouldReset ? 0 : currentDailyVolume,
            maxDailyProtocolVolume,
            timeLeft / 3600
        );
    }
}