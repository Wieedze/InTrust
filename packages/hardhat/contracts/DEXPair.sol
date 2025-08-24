// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title DEX Pair
 * @author intudex team
 * @notice Automated Market Maker for any ERC20 token pair
 * @dev Constant Product Formula (x*y=k) implementation for token swaps and liquidity provision
 */
contract DEXPair is ReentrancyGuard {
    /* ========== STATE VARIABLES ========== */
    
    address public factory;
    address public token0;
    address public token1;
    
    uint112 private reserve0;
    uint112 private reserve1;
    uint32 private blockTimestampLast;
    
    uint256 public price0CumulativeLast;
    uint256 public price1CumulativeLast;
    uint256 public kLast; // reserve0 * reserve1, as of immediately after the most recent liquidity event
    
    uint256 public totalLiquidity;
    mapping(address => uint256) public liquidity;
    
    uint256 private unlocked = 1;
    
    /* ========== EVENTS ========== */
    
    event Mint(address indexed sender, uint amount0, uint amount1);
    event Burn(address indexed sender, uint amount0, uint amount1, address indexed to);
    event Swap(
        address indexed sender,
        uint amount0In,
        uint amount1In,
        uint amount0Out,
        uint amount1Out,
        address indexed to
    );
    event Sync(uint112 reserve0, uint112 reserve1);
    
    /* ========== MODIFIERS ========== */
    
    modifier lock() {
        require(unlocked == 1, 'DEXPair: LOCKED');
        unlocked = 0;
        _;
        unlocked = 1;
    }
    
    /* ========== CONSTRUCTOR ========== */
    
    constructor() {
        factory = msg.sender;
    }
    
    /* ========== INITIALIZATION ========== */
    
    function initialize(address _token0, address _token1) external {
        require(msg.sender == factory, 'DEXPair: FORBIDDEN');
        token0 = _token0;
        token1 = _token1;
    }
    
    /* ========== VIEW FUNCTIONS ========== */
    
    function getReserves() public view returns (uint112 _reserve0, uint112 _reserve1, uint32 _blockTimestampLast) {
        _reserve0 = reserve0;
        _reserve1 = reserve1;
        _blockTimestampLast = blockTimestampLast;
    }
    
    function getLiquidity(address lp) public view returns (uint256) {
        return liquidity[lp];
    }
    
    /* ========== INTERNAL FUNCTIONS ========== */
    
    function _update(uint balance0, uint balance1, uint112 _reserve0, uint112 _reserve1) private {
        require(balance0 <= type(uint112).max && balance1 <= type(uint112).max, 'DEXPair: OVERFLOW');
        uint32 blockTimestamp = uint32(block.timestamp % 2**32);
        uint32 timeElapsed = blockTimestamp - blockTimestampLast;
        
        if (timeElapsed > 0 && _reserve0 != 0 && _reserve1 != 0) {
            price0CumulativeLast += uint(UQ112x112.uqdiv(UQ112x112.encode(_reserve1), _reserve0)) * timeElapsed;
            price1CumulativeLast += uint(UQ112x112.uqdiv(UQ112x112.encode(_reserve0), _reserve1)) * timeElapsed;
        }
        
        reserve0 = uint112(balance0);
        reserve1 = uint112(balance1);
        blockTimestampLast = blockTimestamp;
        emit Sync(reserve0, reserve1);
    }
    
    function _mintFee(uint112 _reserve0, uint112 _reserve1) private returns (bool feeOn) {
        address feeTo = IDEXFactory(factory).feeTo();
        feeOn = feeTo != address(0);
        uint _kLast = kLast;
        if (feeOn) {
            if (_kLast != 0) {
                uint rootK = sqrt(uint(_reserve0) * _reserve1);
                uint rootKLast = sqrt(_kLast);
                if (rootK > rootKLast) {
                    uint numerator = totalLiquidity * (rootK - rootKLast);
                    uint denominator = rootK * 5 + rootKLast;
                    uint liquidityFee = numerator / denominator;
                    if (liquidityFee > 0) liquidity[feeTo] += liquidityFee;
                }
            }
        } else if (_kLast != 0) {
            kLast = 0;
        }
    }
    
    /* ========== MUTATIVE FUNCTIONS ========== */
    
    function mint(address to) external lock returns (uint liquidityMinted) {
        (uint112 _reserve0, uint112 _reserve1,) = getReserves();
        uint balance0 = IERC20(token0).balanceOf(address(this));
        uint balance1 = IERC20(token1).balanceOf(address(this));
        uint amount0 = balance0 - _reserve0;
        uint amount1 = balance1 - _reserve1;
        
        bool feeOn = _mintFee(_reserve0, _reserve1);
        uint _totalLiquidity = totalLiquidity;
        
        if (_totalLiquidity == 0) {
            liquidityMinted = sqrt(amount0 * amount1) - 1000; // Minimum liquidity locked
            liquidity[address(0)] = 1000; // Permanently lock minimum liquidity
        } else {
            liquidityMinted = min(amount0 * _totalLiquidity / _reserve0, amount1 * _totalLiquidity / _reserve1);
        }
        
        require(liquidityMinted > 0, 'DEXPair: INSUFFICIENT_LIQUIDITY_MINTED');
        liquidity[to] += liquidityMinted;
        totalLiquidity += liquidityMinted;
        
        _update(balance0, balance1, _reserve0, _reserve1);
        if (feeOn) kLast = uint(reserve0) * reserve1;
        emit Mint(msg.sender, amount0, amount1);
    }
    
    function burn(address to) external lock returns (uint amount0, uint amount1) {
        (uint112 _reserve0, uint112 _reserve1,) = getReserves();
        address _token0 = token0;
        address _token1 = token1;
        uint balance0 = IERC20(_token0).balanceOf(address(this));
        uint balance1 = IERC20(_token1).balanceOf(address(this));
        uint liquidityToBurn = liquidity[address(this)];
        
        bool feeOn = _mintFee(_reserve0, _reserve1);
        uint _totalLiquidity = totalLiquidity;
        amount0 = liquidityToBurn * balance0 / _totalLiquidity;
        amount1 = liquidityToBurn * balance1 / _totalLiquidity;
        
        require(amount0 > 0 && amount1 > 0, 'DEXPair: INSUFFICIENT_LIQUIDITY_BURNED');
        liquidity[address(this)] -= liquidityToBurn;
        totalLiquidity -= liquidityToBurn;
        
        IERC20(_token0).transfer(to, amount0);
        IERC20(_token1).transfer(to, amount1);
        
        balance0 = IERC20(_token0).balanceOf(address(this));
        balance1 = IERC20(_token1).balanceOf(address(this));
        
        _update(balance0, balance1, _reserve0, _reserve1);
        if (feeOn) kLast = uint(reserve0) * reserve1;
        emit Burn(msg.sender, amount0, amount1, to);
    }
    
    function swap(uint amount0Out, uint amount1Out, address to, bytes calldata data) external lock {
        require(amount0Out > 0 || amount1Out > 0, 'DEXPair: INSUFFICIENT_OUTPUT_AMOUNT');
        (uint112 _reserve0, uint112 _reserve1,) = getReserves();
        require(amount0Out < _reserve0 && amount1Out < _reserve1, 'DEXPair: INSUFFICIENT_LIQUIDITY');
        
        uint balance0;
        uint balance1;
        {
            address _token0 = token0;
            address _token1 = token1;
            require(to != _token0 && to != _token1, 'DEXPair: INVALID_TO');
            if (amount0Out > 0) IERC20(_token0).transfer(to, amount0Out);
            if (amount1Out > 0) IERC20(_token1).transfer(to, amount1Out);
            if (data.length > 0) IDEXCallee(to).dexCall(msg.sender, amount0Out, amount1Out, data);
            balance0 = IERC20(_token0).balanceOf(address(this));
            balance1 = IERC20(_token1).balanceOf(address(this));
        }
        
        uint amount0In = balance0 > _reserve0 - amount0Out ? balance0 - (_reserve0 - amount0Out) : 0;
        uint amount1In = balance1 > _reserve1 - amount1Out ? balance1 - (_reserve1 - amount1Out) : 0;
        require(amount0In > 0 || amount1In > 0, 'DEXPair: INSUFFICIENT_INPUT_AMOUNT');
        
        {
            uint balance0Adjusted = balance0 * 1000 - amount0In * 3; // 0.3% fee
            uint balance1Adjusted = balance1 * 1000 - amount1In * 3;
            require(balance0Adjusted * balance1Adjusted >= uint(_reserve0) * _reserve1 * 1000000, 'DEXPair: K');
        }
        
        _update(balance0, balance1, _reserve0, _reserve1);
        emit Swap(msg.sender, amount0In, amount1In, amount0Out, amount1Out, to);
    }
    
    function skim(address to) external lock {
        address _token0 = token0;
        address _token1 = token1;
        IERC20(_token0).transfer(to, IERC20(_token0).balanceOf(address(this)) - reserve0);
        IERC20(_token1).transfer(to, IERC20(_token1).balanceOf(address(this)) - reserve1);
    }
    
    function sync() external lock {
        _update(IERC20(token0).balanceOf(address(this)), IERC20(token1).balanceOf(address(this)), reserve0, reserve1);
    }
    
    /* ========== HELPER FUNCTIONS ========== */
    
    function sqrt(uint y) internal pure returns (uint z) {
        if (y > 3) {
            z = y;
            uint x = y / 2 + 1;
            while (x < z) {
                z = x;
                x = (y / x + x) / 2;
            }
        } else if (y != 0) {
            z = 1;
        }
    }
    
    function min(uint x, uint y) internal pure returns (uint z) {
        z = x < y ? x : y;
    }
}

/* ========== LIBRARIES ========== */

library UQ112x112 {
    uint224 constant Q112 = 2**112;
    
    function encode(uint112 y) internal pure returns (uint224 z) {
        z = uint224(y) * Q112;
    }
    
    function uqdiv(uint224 x, uint112 y) internal pure returns (uint224 z) {
        z = x / uint224(y);
    }
}

/* ========== INTERFACES ========== */

interface IDEXFactory {
    function feeTo() external view returns (address);
}

interface IDEXCallee {
    function dexCall(address sender, uint amount0, uint amount1, bytes calldata data) external;
}