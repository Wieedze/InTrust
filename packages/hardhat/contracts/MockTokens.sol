// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @title Mock Bitcoin Token
 * @dev For testing purposes only - represents bridged Bitcoin
 */
contract MockBTC is ERC20 {
    constructor() ERC20("Bitcoin", "BTC") {
        _mint(msg.sender, 21_000_000 * 10**8); // 21M BTC with 8 decimals
    }

    function decimals() public pure override returns (uint8) {
        return 8;
    }
}

/**
 * @title Mock Ethereum Token  
 * @dev For testing purposes only - represents bridged Ethereum
 */
contract MockETH is ERC20 {
    constructor() ERC20("Ethereum", "ETH") {
        _mint(msg.sender, 120_000_000 * 10**18); // 120M ETH with 18 decimals
    }
}

/**
 * @title Mock USDC Token
 * @dev For testing purposes only - represents bridged USDC
 */
contract MockUSDC is ERC20 {
    constructor() ERC20("USD Coin", "USDC") {
        _mint(msg.sender, 1_000_000_000 * 10**6); // 1B USDC with 6 decimals
    }

    function decimals() public pure override returns (uint8) {
        return 6;
    }
}

/**
 * @title Mock USDT Token
 * @dev For testing purposes only - represents bridged Tether
 */
contract MockUSDT is ERC20 {
    constructor() ERC20("Tether USD", "USDT") {
        _mint(msg.sender, 1_000_000_000 * 10**6); // 1B USDT with 6 decimals
    }

    function decimals() public pure override returns (uint8) {
        return 6;
    }
}