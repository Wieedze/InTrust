// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @title Wrapped ETH (WETH)
 * @notice Simple WETH implementation for testing DEX functionality
 * @dev Wraps native ETH/TTRUST into an ERC20 token
 */
contract WETH is ERC20 {
    /* ========== EVENTS ========== */
    
    event Deposit(address indexed dst, uint wad);
    event Withdrawal(address indexed src, uint wad);
    
    /* ========== CONSTRUCTOR ========== */
    
    constructor() ERC20("Wrapped TTRUST", "WTTRUST") {}
    
    /* ========== FUNCTIONS ========== */
    
    /**
     * @notice Deposit ETH/TTRUST and mint WETH tokens
     */
    function deposit() public payable {
        _mint(msg.sender, msg.value);
        emit Deposit(msg.sender, msg.value);
    }
    
    /**
     * @notice Withdraw ETH/TTRUST by burning WETH tokens
     */
    function withdraw(uint wad) public {
        require(balanceOf(msg.sender) >= wad, "WETH: insufficient balance");
        _burn(msg.sender, wad);
        payable(msg.sender).transfer(wad);
        emit Withdrawal(msg.sender, wad);
    }
    
    /**
     * @notice Fallback function to deposit when ETH is sent directly
     */
    receive() external payable {
        deposit();
    }
    
    /* ========== VIEW FUNCTIONS ========== */
    
    function decimals() public pure override returns (uint8) {
        return 18;
    }
}