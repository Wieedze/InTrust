// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title DEX Router
 * @author intudex team
 * @notice Router contract for simplified interactions with DEX pairs
 * @dev Handles swaps, liquidity provision, and multi-hop trading
 */
contract DEXRouter is ReentrancyGuard {
    /* ========== STATE VARIABLES ========== */
    
    address public immutable factory;
    address public immutable WETH;
    
    /* ========== EVENTS ========== */
    
    event SwapETHForTokens(uint amountIn, uint amountOut, address[] path, address indexed to);
    event SwapTokensForETH(uint amountIn, uint amountOut, address[] path, address indexed to);
    event SwapTokensForTokens(uint amountIn, uint amountOut, address[] path, address indexed to);
    
    /* ========== CONSTRUCTOR ========== */
    
    constructor(address _factory, address _WETH) {
        factory = _factory;
        WETH = _WETH;
    }
    
    /* ========== MODIFIERS ========== */
    
    modifier ensure(uint deadline) {
        require(deadline >= block.timestamp, 'DEXRouter: EXPIRED');
        _;
    }
    
    /* ========== VIEW FUNCTIONS ========== */
    
    function quote(uint amountA, uint reserveA, uint reserveB) public pure returns (uint amountB) {
        require(amountA > 0, 'DEXRouter: INSUFFICIENT_AMOUNT');
        require(reserveA > 0 && reserveB > 0, 'DEXRouter: INSUFFICIENT_LIQUIDITY');
        amountB = amountA * reserveB / reserveA;
    }
    
    function getAmountOut(uint amountIn, uint reserveIn, uint reserveOut) public pure returns (uint amountOut) {
        require(amountIn > 0, 'DEXRouter: INSUFFICIENT_INPUT_AMOUNT');
        require(reserveIn > 0 && reserveOut > 0, 'DEXRouter: INSUFFICIENT_LIQUIDITY');
        uint amountInWithFee = amountIn * 997;
        uint numerator = amountInWithFee * reserveOut;
        uint denominator = reserveIn * 1000 + amountInWithFee;
        amountOut = numerator / denominator;
    }
    
    function getAmountIn(uint amountOut, uint reserveIn, uint reserveOut) public pure returns (uint amountIn) {
        require(amountOut > 0, 'DEXRouter: INSUFFICIENT_OUTPUT_AMOUNT');
        require(reserveIn > 0 && reserveOut > 0, 'DEXRouter: INSUFFICIENT_LIQUIDITY');
        uint numerator = reserveIn * amountOut * 1000;
        uint denominator = (reserveOut - amountOut) * 997;
        amountIn = (numerator / denominator) + 1;
    }
    
    function getAmountsOut(uint amountIn, address[] memory path) public view returns (uint[] memory amounts) {
        require(path.length >= 2, 'DEXRouter: INVALID_PATH');
        amounts = new uint[](path.length);
        amounts[0] = amountIn;
        for (uint i; i < path.length - 1; i++) {
            (uint reserveIn, uint reserveOut) = getReserves(path[i], path[i + 1]);
            amounts[i + 1] = getAmountOut(amounts[i], reserveIn, reserveOut);
        }
    }
    
    function getAmountsIn(uint amountOut, address[] memory path) public view returns (uint[] memory amounts) {
        require(path.length >= 2, 'DEXRouter: INVALID_PATH');
        amounts = new uint[](path.length);
        amounts[amounts.length - 1] = amountOut;
        for (uint i = path.length - 1; i > 0; i--) {
            (uint reserveIn, uint reserveOut) = getReserves(path[i - 1], path[i]);
            amounts[i - 1] = getAmountIn(amounts[i], reserveIn, reserveOut);
        }
    }
    
    function getReserves(address tokenA, address tokenB) public view returns (uint reserveA, uint reserveB) {
        (address token0,) = sortTokens(tokenA, tokenB);
        address pair = pairFor(tokenA, tokenB);
        (uint reserve0, uint reserve1,) = IDEXPair(pair).getReserves();
        (reserveA, reserveB) = tokenA == token0 ? (reserve0, reserve1) : (reserve1, reserve0);
    }
    
    /* ========== INTERNAL FUNCTIONS ========== */
    
    function sortTokens(address tokenA, address tokenB) internal pure returns (address token0, address token1) {
        require(tokenA != tokenB, 'DEXRouter: IDENTICAL_ADDRESSES');
        (token0, token1) = tokenA < tokenB ? (tokenA, tokenB) : (tokenB, tokenA);
        require(token0 != address(0), 'DEXRouter: ZERO_ADDRESS');
    }
    
    function pairFor(address tokenA, address tokenB) internal view returns (address pair) {
        return IDEXFactory(factory).getPair(tokenA, tokenB);
    }
    
    function _swap(uint[] memory amounts, address[] memory path, address _to) internal virtual {
        for (uint i; i < path.length - 1; i++) {
            (address input, address output) = (path[i], path[i + 1]);
            (address token0,) = sortTokens(input, output);
            uint amountOut = amounts[i + 1];
            (uint amount0Out, uint amount1Out) = input == token0 ? (uint(0), amountOut) : (amountOut, uint(0));
            address to = i < path.length - 2 ? pairFor(output, path[i + 2]) : _to;
            IDEXPair(pairFor(input, output)).swap(amount0Out, amount1Out, to, new bytes(0));
        }
    }
    
    /* ========== LIQUIDITY FUNCTIONS ========== */
    
    function addLiquidity(
        address tokenA,
        address tokenB,
        uint amountADesired,
        uint amountBDesired,
        uint amountAMin,
        uint amountBMin,
        address to,
        uint deadline
    ) external ensure(deadline) returns (uint amountA, uint amountB, uint liquidity) {
        (amountA, amountB) = _addLiquidity(tokenA, tokenB, amountADesired, amountBDesired, amountAMin, amountBMin);
        address pair = pairFor(tokenA, tokenB);
        IERC20(tokenA).transferFrom(msg.sender, pair, amountA);
        IERC20(tokenB).transferFrom(msg.sender, pair, amountB);
        liquidity = IDEXPair(pair).mint(to);
    }
    
    function addLiquidityETH(
        address token,
        uint amountTokenDesired,
        uint amountTokenMin,
        uint amountETHMin,
        address to,
        uint deadline
    ) external payable ensure(deadline) returns (uint amountToken, uint amountETH, uint liquidity) {
        (amountToken, amountETH) = _addLiquidity(
            token,
            WETH,
            amountTokenDesired,
            msg.value,
            amountTokenMin,
            amountETHMin
        );
        address pair = pairFor(token, WETH);
        IERC20(token).transferFrom(msg.sender, pair, amountToken);
        IWETH(WETH).deposit{value: amountETH}();
        assert(IWETH(WETH).transfer(pair, amountETH));
        liquidity = IDEXPair(pair).mint(to);
        if (msg.value > amountETH) {
            payable(msg.sender).transfer(msg.value - amountETH);
        }
    }
    
    function _addLiquidity(
        address tokenA,
        address tokenB,
        uint amountADesired,
        uint amountBDesired,
        uint amountAMin,
        uint amountBMin
    ) internal returns (uint amountA, uint amountB) {
        if (IDEXFactory(factory).getPair(tokenA, tokenB) == address(0)) {
            IDEXFactory(factory).createPair(tokenA, tokenB);
        }
        (uint reserveA, uint reserveB) = getReserves(tokenA, tokenB);
        if (reserveA == 0 && reserveB == 0) {
            (amountA, amountB) = (amountADesired, amountBDesired);
        } else {
            uint amountBOptimal = quote(amountADesired, reserveA, reserveB);
            if (amountBOptimal <= amountBDesired) {
                require(amountBOptimal >= amountBMin, 'DEXRouter: INSUFFICIENT_B_AMOUNT');
                (amountA, amountB) = (amountADesired, amountBOptimal);
            } else {
                uint amountAOptimal = quote(amountBDesired, reserveB, reserveA);
                assert(amountAOptimal <= amountADesired);
                require(amountAOptimal >= amountAMin, 'DEXRouter: INSUFFICIENT_A_AMOUNT');
                (amountA, amountB) = (amountAOptimal, amountBDesired);
            }
        }
    }
    
    /* ========== SWAP FUNCTIONS ========== */
    
    function swapExactTokensForTokens(
        uint amountIn,
        uint amountOutMin,
        address[] calldata path,
        address to,
        uint deadline
    ) external ensure(deadline) returns (uint[] memory amounts) {
        amounts = getAmountsOut(amountIn, path);
        require(amounts[amounts.length - 1] >= amountOutMin, 'DEXRouter: INSUFFICIENT_OUTPUT_AMOUNT');
        IERC20(path[0]).transferFrom(msg.sender, pairFor(path[0], path[1]), amounts[0]);
        _swap(amounts, path, to);
        emit SwapTokensForTokens(amountIn, amounts[amounts.length - 1], path, to);
    }
    
    function swapTokensForExactTokens(
        uint amountOut,
        uint amountInMax,
        address[] calldata path,
        address to,
        uint deadline
    ) external ensure(deadline) returns (uint[] memory amounts) {
        amounts = getAmountsIn(amountOut, path);
        require(amounts[0] <= amountInMax, 'DEXRouter: EXCESSIVE_INPUT_AMOUNT');
        IERC20(path[0]).transferFrom(msg.sender, pairFor(path[0], path[1]), amounts[0]);
        _swap(amounts, path, to);
        emit SwapTokensForTokens(amounts[0], amountOut, path, to);
    }
    
    function swapExactETHForTokens(uint amountOutMin, address[] calldata path, address to, uint deadline)
        external
        payable
        ensure(deadline)
        returns (uint[] memory amounts)
    {
        require(path[0] == WETH, 'DEXRouter: INVALID_PATH');
        amounts = getAmountsOut(msg.value, path);
        require(amounts[amounts.length - 1] >= amountOutMin, 'DEXRouter: INSUFFICIENT_OUTPUT_AMOUNT');
        IWETH(WETH).deposit{value: amounts[0]}();
        assert(IWETH(WETH).transfer(pairFor(path[0], path[1]), amounts[0]));
        _swap(amounts, path, to);
        emit SwapETHForTokens(msg.value, amounts[amounts.length - 1], path, to);
    }
    
    function swapExactTokensForETH(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline)
        external
        ensure(deadline)
        returns (uint[] memory amounts)
    {
        require(path[path.length - 1] == WETH, 'DEXRouter: INVALID_PATH');
        amounts = getAmountsOut(amountIn, path);
        require(amounts[amounts.length - 1] >= amountOutMin, 'DEXRouter: INSUFFICIENT_OUTPUT_AMOUNT');
        IERC20(path[0]).transferFrom(msg.sender, pairFor(path[0], path[1]), amounts[0]);
        _swap(amounts, path, address(this));
        IWETH(WETH).withdraw(amounts[amounts.length - 1]);
        payable(to).transfer(amounts[amounts.length - 1]);
        emit SwapTokensForETH(amountIn, amounts[amounts.length - 1], path, to);
    }
    
    /* ========== EMERGENCY FUNCTIONS ========== */
    
    receive() external payable {
        assert(msg.sender == WETH);
    }
}

/* ========== INTERFACES ========== */

interface IDEXFactory {
    function getPair(address tokenA, address tokenB) external view returns (address pair);
    function createPair(address tokenA, address tokenB) external returns (address pair);
}

interface IDEXPair {
    function getReserves() external view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast);
    function mint(address to) external returns (uint liquidity);
    function swap(uint amount0Out, uint amount1Out, address to, bytes calldata data) external;
}

interface IWETH {
    function deposit() external payable;
    function transfer(address to, uint value) external returns (bool);
    function withdraw(uint) external;
}