// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./EmergencyPausable.sol";

/**
 * @title AdminTimelock
 * @dev Timelock mechanism for critical admin functions
 * Prevents immediate execution of dangerous operations
 */
contract AdminTimelock is EmergencyPausable {
    
    struct PendingAction {
        bytes32 actionHash;
        uint256 executeTime;
        bool executed;
        string description;
        address target;
        bytes data;
        uint256 value;
    }
    
    // Timelock delays for different types of actions
    uint256 public constant CRITICAL_DELAY = 48 hours;  // Critical changes (ownership, emergency functions)
    uint256 public constant MAJOR_DELAY = 24 hours;     // Major changes (limits, rates)
    uint256 public constant MINOR_DELAY = 2 hours;      // Minor changes (small parameter adjustments)
    
    // Minimum and maximum delays
    uint256 public constant MIN_DELAY = 1 hours;
    uint256 public constant MAX_DELAY = 7 days;
    
    // Action categories
    enum ActionType {
        CRITICAL,   // Ownership transfer, emergency controls
        MAJOR,      // Significant parameter changes
        MINOR       // Small adjustments
    }
    
    mapping(bytes32 => PendingAction) public pendingActions;
    mapping(string => ActionType) public actionTypes;
    
    // Admin roles
    mapping(address => bool) public isAdmin;
    mapping(address => bool) public isEmergencyAdmin;
    
    event ActionQueued(
        bytes32 indexed actionHash,
        address indexed target,
        string description,
        uint256 executeTime
    );
    
    event ActionExecuted(
        bytes32 indexed actionHash,
        address indexed target,
        string description
    );
    
    event ActionCancelled(
        bytes32 indexed actionHash,
        string reason
    );
    
    event AdminAdded(address indexed admin, bool isEmergency);
    event AdminRemoved(address indexed admin);
    event ActionTypeSet(string action, ActionType actionType);
    
    constructor() EmergencyPausable() {
        // Set up initial action types
        _setActionType("transferOwnership", ActionType.CRITICAL);
        _setActionType("setEmergencyAdmin", ActionType.CRITICAL);
        _setActionType("updateSwapLimits", ActionType.MAJOR);
        _setActionType("updateStakeLimits", ActionType.MAJOR);
        _setActionType("updateRewardRate", ActionType.MAJOR);
        _setActionType("updateProtocolLimit", ActionType.MAJOR);
        _setActionType("setWhitelisted", ActionType.MINOR);
        _setActionType("updateClaimAmount", ActionType.MINOR);
        _setActionType("updateMinStakeAmount", ActionType.MINOR);
    }
    
    modifier onlyAdmin() {
        require(isAdmin[msg.sender] || msg.sender == owner(), "AdminTimelock: Not admin");
        _;
    }
    
    modifier onlyEmergencyAdmin() {
        require(isEmergencyAdmin[msg.sender] || msg.sender == owner(), "AdminTimelock: Not emergency admin");
        _;
    }
    
    /**
     * @dev Queue an admin action for delayed execution
     */
    function queueAction(
        address target,
        bytes calldata data,
        uint256 value,
        string memory description,
        string memory actionName
    ) external onlyAdmin whenNotPaused returns (bytes32 actionHash) {
        
        // Calculate execution time based on action type
        ActionType actionType = actionTypes[actionName];
        uint256 delay;
        
        if (actionType == ActionType.CRITICAL) {
            delay = CRITICAL_DELAY;
        } else if (actionType == ActionType.MAJOR) {
            delay = MAJOR_DELAY;
        } else {
            delay = MINOR_DELAY;
        }
        
        uint256 executeTime = block.timestamp + delay;
        actionHash = keccak256(abi.encode(target, data, value, description, executeTime));
        
        require(pendingActions[actionHash].executeTime == 0, "AdminTimelock: Action already queued");
        
        pendingActions[actionHash] = PendingAction({
            actionHash: actionHash,
            executeTime: executeTime,
            executed: false,
            description: description,
            target: target,
            data: data,
            value: value
        });
        
        emit ActionQueued(actionHash, target, description, executeTime);
        
        return actionHash;
    }
    
    /**
     * @dev Execute a queued action after timelock period
     */
    function executeAction(bytes32 actionHash) external onlyAdmin whenNotPaused {
        PendingAction storage action = pendingActions[actionHash];
        
        require(action.executeTime != 0, "AdminTimelock: Action not queued");
        require(!action.executed, "AdminTimelock: Action already executed");
        require(block.timestamp >= action.executeTime, "AdminTimelock: Action not ready");
        require(block.timestamp <= action.executeTime + 7 days, "AdminTimelock: Action expired");
        
        action.executed = true;
        
        (bool success, bytes memory returnData) = action.target.call{value: action.value}(action.data);
        require(success, string(abi.encodePacked("AdminTimelock: Execution failed: ", returnData)));
        
        emit ActionExecuted(actionHash, action.target, action.description);
    }
    
    /**
     * @dev Cancel a queued action
     */
    function cancelAction(bytes32 actionHash, string memory reason) external onlyAdmin {
        require(pendingActions[actionHash].executeTime != 0, "AdminTimelock: Action not queued");
        require(!pendingActions[actionHash].executed, "AdminTimelock: Action already executed");
        
        delete pendingActions[actionHash];
        emit ActionCancelled(actionHash, reason);
    }
    
    /**
     * @dev Emergency execution bypass (only for emergency admins)
     */
    function emergencyExecute(
        address target,
        bytes calldata data,
        uint256 value,
        string memory description
    ) external onlyEmergencyAdmin {
        require(paused(), "AdminTimelock: Emergency execute only when paused");
        
        (bool success, bytes memory returnData) = target.call{value: value}(data);
        require(success, string(abi.encodePacked("AdminTimelock: Emergency execution failed: ", returnData)));
        
        bytes32 actionHash = keccak256(abi.encode(target, data, value, description, block.timestamp));
        emit ActionExecuted(actionHash, target, description);
    }
    
    /**
     * @dev Admin management functions
     */
    
    function addAdmin(address admin, bool emergency) external onlyOwner {
        isAdmin[admin] = true;
        if (emergency) {
            isEmergencyAdmin[admin] = true;
        }
        emit AdminAdded(admin, emergency);
    }
    
    function removeAdmin(address admin) external onlyOwner {
        isAdmin[admin] = false;
        isEmergencyAdmin[admin] = false;
        emit AdminRemoved(admin);
    }
    
    function setActionType(string memory action, ActionType actionType) external onlyOwner {
        _setActionType(action, actionType);
    }
    
    function _setActionType(string memory action, ActionType actionType) internal {
        actionTypes[action] = actionType;
        emit ActionTypeSet(action, actionType);
    }
    
    /**
     * @dev View functions
     */
    
    function getActionInfo(bytes32 actionHash) external view returns (
        uint256 executeTime,
        bool executed,
        string memory description,
        address target,
        uint256 timeRemaining
    ) {
        PendingAction memory action = pendingActions[actionHash];
        uint256 remaining = action.executeTime > block.timestamp ? action.executeTime - block.timestamp : 0;
        
        return (
            action.executeTime,
            action.executed,
            action.description,
            action.target,
            remaining
        );
    }
    
    function canExecute(bytes32 actionHash) external view returns (bool) {
        PendingAction memory action = pendingActions[actionHash];
        return action.executeTime != 0 && 
               !action.executed && 
               block.timestamp >= action.executeTime &&
               block.timestamp <= action.executeTime + 7 days;
    }
    
    function getActionDelay(string memory actionName) external view returns (uint256) {
        ActionType actionType = actionTypes[actionName];
        
        if (actionType == ActionType.CRITICAL) {
            return CRITICAL_DELAY;
        } else if (actionType == ActionType.MAJOR) {
            return MAJOR_DELAY;
        } else {
            return MINOR_DELAY;
        }
    }
    
    function isReadyToExecute(bytes32 actionHash) external view returns (bool ready, uint256 timeRemaining) {
        PendingAction memory action = pendingActions[actionHash];
        
        if (action.executeTime == 0 || action.executed) {
            return (false, 0);
        }
        
        if (block.timestamp >= action.executeTime) {
            return (true, 0);
        }
        
        return (false, action.executeTime - block.timestamp);
    }
    
    /**
     * @dev Helper function to generate action hash
     */
    function getActionHash(
        address target,
        bytes calldata data,
        uint256 value,
        string memory description,
        uint256 executeTime
    ) external pure returns (bytes32) {
        return keccak256(abi.encode(target, data, value, description, executeTime));
    }
}