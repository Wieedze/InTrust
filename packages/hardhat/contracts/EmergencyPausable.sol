// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title EmergencyPausable
 * @dev Contract with emergency pause functionality
 */
contract EmergencyPausable is Ownable, Pausable {
    
    event EmergencyPause(address indexed caller, string reason);
    event EmergencyUnpause(address indexed caller);
    
    constructor() Ownable(msg.sender) {}
    
    /**
     * @dev Emergency pause - can be called by owner
     */
    function emergencyPause(string memory reason) external onlyOwner {
        _pause();
        emit EmergencyPause(msg.sender, reason);
    }
    
    /**
     * @dev Emergency unpause - can be called by owner
     */
    function emergencyUnpause() external onlyOwner {
        _unpause();
        emit EmergencyUnpause(msg.sender);
    }
    
    /**
     * @dev Check if contract is paused
     */
    function isPaused() external view returns (bool) {
        return paused();
    }
}