// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "./DEXPair.sol";

/**
 * @title DEX Factory
 * @author intudex team
 * @notice Factory contract to create and manage trading pairs for any ERC20 tokens
 * @dev Creates DEXPair contracts for each token pair and manages them
 */
contract DEXFactory {
    /* ========== STATE VARIABLES ========== */
    
    address public feeTo;
    address public feeToSetter;
    
    mapping(address => mapping(address => address)) public getPair;
    address[] public allPairs;
    
    /* ========== EVENTS ========== */
    
    event PairCreated(address indexed token0, address indexed token1, address pair, uint);
    
    /* ========== CONSTRUCTOR ========== */
    
    constructor(address _feeToSetter) {
        feeToSetter = _feeToSetter;
    }
    
    /* ========== VIEW FUNCTIONS ========== */
    
    function allPairsLength() external view returns (uint) {
        return allPairs.length;
    }
    
    /* ========== MUTATIVE FUNCTIONS ========== */
    
    /**
     * @notice Creates a new trading pair for two tokens
     * @param tokenA Address of first token
     * @param tokenB Address of second token
     * @return pair Address of the created pair contract
     */
    function createPair(address tokenA, address tokenB) external returns (address pair) {
        require(tokenA != tokenB, 'DEXFactory: IDENTICAL_ADDRESSES');
        
        // Sort tokens to ensure consistent pair addresses
        (address token0, address token1) = tokenA < tokenB ? (tokenA, tokenB) : (tokenB, tokenA);
        require(token0 != address(0), 'DEXFactory: ZERO_ADDRESS');
        require(getPair[token0][token1] == address(0), 'DEXFactory: PAIR_EXISTS');
        
        // Create new pair contract
        bytes memory bytecode = type(DEXPair).creationCode;
        bytes32 salt = keccak256(abi.encodePacked(token0, token1));
        
        assembly {
            pair := create2(0, add(bytecode, 32), mload(bytecode), salt)
        }
        
        // Initialize the pair
        IDEXPair(pair).initialize(token0, token1);
        
        // Update mappings
        getPair[token0][token1] = pair;
        getPair[token1][token0] = pair; // populate mapping in the reverse direction
        allPairs.push(pair);
        
        emit PairCreated(token0, token1, pair, allPairs.length);
    }
    
    /**
     * @notice Sets the fee recipient address
     */
    function setFeeTo(address _feeTo) external {
        require(msg.sender == feeToSetter, 'DEXFactory: FORBIDDEN');
        feeTo = _feeTo;
    }
    
    /**
     * @notice Sets the fee setter address
     */
    function setFeeToSetter(address _feeToSetter) external {
        require(msg.sender == feeToSetter, 'DEXFactory: FORBIDDEN');
        feeToSetter = _feeToSetter;
    }
    
    /**
     * @notice Calculate pair address without deploying
     * @param tokenA First token address
     * @param tokenB Second token address
     * @return pair Predicted pair address
     */
    function pairFor(address tokenA, address tokenB) external view returns (address pair) {
        (address token0, address token1) = tokenA < tokenB ? (tokenA, tokenB) : (tokenB, tokenA);
        pair = address(uint160(uint256(keccak256(abi.encodePacked(
            hex'ff',
            address(this),
            keccak256(abi.encodePacked(token0, token1)),
            keccak256(type(DEXPair).creationCode)
        )))));
    }
}

/**
 * @title IDEXPair Interface
 * @notice Interface for DEXPair contract initialization
 */
interface IDEXPair {
    function initialize(address, address) external;
}