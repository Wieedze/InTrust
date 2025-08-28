"use client";

import { useState } from "react";
import { parseEther } from "viem";
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { Card, CardContent } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import { Plus, ExternalLink } from "lucide-react";

export const TokenBridge = () => {
  const { address: connectedAddress } = useAccount();
  const [newTokenAddress, setNewTokenAddress] = useState("");
  const [newTokenSymbol, setNewTokenSymbol] = useState("");
  const [newTokenName, setNewTokenName] = useState("");

  // DEX Factory address
  const dexFactoryAddress = "0x54D248E118983dDdDF4DAA605CBa832BA6F1eb4C";
  const intuitAddress = "0xe8bD8876CB6f97663c668faae65C4Da579FfA0B5";
  // Pour créer des paires avec TRUST natif, nous devons trouver l'adresse WETH déployée
  // ou créer des paires directement avec le router qui gère les tokens natifs
  const wethAddress = "0x0000000000000000000000000000000000000000"; // Adresse nulle pour TRUST natif

  // Factory ABI for creating pairs
  const factoryAbi = [
    {
      name: "createPair",
      type: "function",
      stateMutability: "nonpayable",
      inputs: [
        { name: "tokenA", type: "address" },
        { name: "tokenB", type: "address" }
      ],
      outputs: [{ name: "pair", type: "address" }],
    },
    {
      name: "getPair",
      type: "function", 
      stateMutability: "view",
      inputs: [
        { name: "tokenA", type: "address" },
        { name: "tokenB", type: "address" }
      ],
      outputs: [{ name: "pair", type: "address" }],
    }
  ] as const;

  const { writeContract, isPending, data: writeData } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash: writeData,
  });

  // Popular token addresses on different networks (examples)
  const popularTokens = [
    { symbol: "USDC", name: "USD Coin", address: "0xA0b86a33E6441E539Eca1dF08E65A5b1e3A4c4b" },
    { symbol: "USDT", name: "Tether USD", address: "0x55d398326f99059fF775485246999027B3197955" },
    { symbol: "WETH", name: "Wrapped Ethereum", address: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2" },
    { symbol: "DAI", name: "Dai Stablecoin", address: "0x6B175474E89094C44Da98b954EedeAC495271d0F" },
  ];

  const handleCreatePair = async () => {
    if (!newTokenAddress || !connectedAddress) return;
    
    try {
      await writeContract({
        address: dexFactoryAddress as `0x${string}`,
        abi: factoryAbi,
        functionName: "createPair",
        args: [newTokenAddress as `0x${string}`, wethAddress as `0x${string}`],
        gas: 300000n,
      });
    } catch (error) {
      console.error("Failed to create pair:", error);
    }
  };

  const handleQuickAdd = (token: typeof popularTokens[0]) => {
    setNewTokenAddress(token.address);
    setNewTokenSymbol(token.symbol);
    setNewTokenName(token.name);
  };

  const isLoading = isPending || isConfirming;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-violet-900 p-4">
      <div className="max-w-2xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold text-white">Token Bridge</h1>
          <p className="text-gray-300">Add new tokens and create trading pairs with TRUST</p>
        </div>

        {/* Create New Pair */}
        <Card className="bg-white/5 border-white/20 backdrop-blur-2xl">
          <CardContent className="p-6 space-y-4">
            <h2 className="text-xl font-semibold text-white">Create New Trading Pair</h2>
            
            <div className="space-y-4">
              {/* Token Address Input */}
              <div className="space-y-2">
                <label className="text-sm text-gray-300">Token Contract Address</label>
                <Input
                  type="text"
                  placeholder="0x..."
                  value={newTokenAddress}
                  onChange={(e) => setNewTokenAddress(e.target.value)}
                  className="bg-black/20 border-white/20 text-white placeholder-gray-400"
                />
              </div>

              {/* Token Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm text-gray-300">Token Symbol</label>
                  <Input
                    type="text"
                    placeholder="e.g. USDC"
                    value={newTokenSymbol}
                    onChange={(e) => setNewTokenSymbol(e.target.value)}
                    className="bg-black/20 border-white/20 text-white placeholder-gray-400"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-gray-300">Token Name</label>
                  <Input
                    type="text"
                    placeholder="e.g. USD Coin"
                    value={newTokenName}
                    onChange={(e) => setNewTokenName(e.target.value)}
                    className="bg-black/20 border-white/20 text-white placeholder-gray-400"
                  />
                </div>
              </div>

              {/* Create Pair Button */}
              <Button
                onClick={handleCreatePair}
                disabled={!newTokenAddress || !connectedAddress || isLoading}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3"
              >
                {isLoading ? (
                  "Creating Pair..."
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-2" />
                    Create {newTokenSymbol || "Token"}/INTUIT Pair
                  </>
                )}
              </Button>

              {isConfirmed && (
                <Badge className="w-full justify-center bg-green-500/20 text-green-300">
                  ✅ Trading pair created successfully!
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Popular Tokens Quick Add */}
        <Card className="bg-white/5 border-white/20 backdrop-blur-2xl">
          <CardContent className="p-6 space-y-4">
            <h3 className="text-lg font-semibold text-white">Popular Tokens</h3>
            <p className="text-sm text-gray-400">Quick add popular tokens (update addresses for your network)</p>
            
            <div className="grid grid-cols-2 gap-3">
              {popularTokens.map((token) => (
                <Button
                  key={token.symbol}
                  onClick={() => handleQuickAdd(token)}
                  variant="outline"
                  className="bg-white/5 border-white/20 text-white hover:bg-white/10 p-4 h-auto flex flex-col items-start space-y-1"
                >
                  <div className="font-semibold">{token.symbol}</div>
                  <div className="text-xs text-gray-400">{token.name}</div>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* How it Works */}
        <Card className="bg-white/5 border-white/20 backdrop-blur-2xl">
          <CardContent className="p-6 space-y-4">
            <h3 className="text-lg font-semibold text-white">How Token Bridges Work</h3>
            
            <div className="space-y-3 text-sm text-gray-300">
              <div className="flex items-start space-x-3">
                <Badge className="bg-purple-500/20 text-purple-300">1</Badge>
                <div>
                  <div className="font-medium text-white">Add Token Address</div>
                  <div>Enter the contract address of any ERC20 token</div>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <Badge className="bg-purple-500/20 text-purple-300">2</Badge>
                <div>
                  <div className="font-medium text-white">Create Pair</div>
                  <div>Factory creates a new Token/INTUIT trading pair</div>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <Badge className="bg-purple-500/20 text-purple-300">3</Badge>
                <div>
                  <div className="font-medium text-white">Add Liquidity</div>
                  <div>Add initial liquidity to enable trading</div>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <Badge className="bg-purple-500/20 text-purple-300">4</Badge>
                <div>
                  <div className="font-medium text-white">Start Trading</div>
                  <div>Token appears in DEX interface for swapping</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Contract Info */}
        <Card className="bg-white/5 border-white/20 backdrop-blur-2xl">
          <CardContent className="p-6 space-y-4">
            <h3 className="text-lg font-semibold text-white">Contract Information</h3>
            
            <div className="space-y-2 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-gray-400">DEX Factory:</span>
                <div className="flex items-center space-x-2">
                  <code className="bg-black/20 px-2 py-1 rounded text-xs text-white">
                    {dexFactoryAddress}
                  </code>
                  <ExternalLink className="w-4 h-4 text-gray-400" />
                </div>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-gray-400">INTUIT Token:</span>
                <div className="flex items-center space-x-2">
                  <code className="bg-black/20 px-2 py-1 rounded text-xs text-white">
                    {intuitAddress}
                  </code>
                  <ExternalLink className="w-4 h-4 text-gray-400" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  );
};