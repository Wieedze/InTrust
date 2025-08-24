"use client";

import { useState } from "react";
import { AVAILABLE_TOKENS, FACTORY_ABI, FACTORY_ADDRESSES, Token } from "../utils/dexFactory";
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import { ExternalLink, Plus } from "lucide-react";
import { useAccount, useReadContract, useWriteContract } from "wagmi";

export const PairManager = () => {
  const { address } = useAccount();
  const [tokenA, setTokenA] = useState<Token | null>(null);
  const [tokenB, setTokenB] = useState<Token | null>(null);
  const [isCreatingPair, setIsCreatingPair] = useState(false);

  const { writeContract } = useWriteContract();

  // Vérifier si une paire existe déjà
  const { data: existingPair } = useReadContract({
    address: FACTORY_ADDRESSES.DEX_FACTORY,
    abi: FACTORY_ABI,
    functionName: "getPair",
    args: tokenA && tokenB ? [tokenA.address, tokenB.address] : undefined,
    query: { enabled: !!(tokenA && tokenB) },
  });

  const handleCreatePair = async () => {
    if (!tokenA || !tokenB || !address) return;

    setIsCreatingPair(true);
    try {
      await writeContract({
        address: FACTORY_ADDRESSES.DEX_FACTORY,
        abi: FACTORY_ABI,
        functionName: "createPair",
        args: [tokenA.address, tokenB.address],
      });
    } catch (error) {
      console.error("Error creating pair:", error);
    } finally {
      setIsCreatingPair(false);
    }
  };

  const pairExists = existingPair && existingPair !== "0x0000000000000000000000000000000000000000";

  return (
    <Card className="bg-white/5 border-white/20 backdrop-blur-2xl">
      <CardContent className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-white">Create Trading Pair</h2>
          <Badge variant="outline" className="bg-green-500/20 border-green-400/50 text-green-300">
            Factory Pattern
          </Badge>
        </div>

        <div className="space-y-4">
          {/* Token A Selection */}
          <div>
            <label className="text-sm text-gray-300 mb-2 block">First Token</label>
            <select
              onChange={e => {
                const token = AVAILABLE_TOKENS.find(t => t.symbol === e.target.value);
                setTokenA(token || null);
              }}
              className="w-full bg-black/20 border border-white/20 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-white/50 focus:border-transparent"
            >
              <option value="" className="bg-gray-800">
                Select first token
              </option>
              {AVAILABLE_TOKENS.map(token => (
                <option key={token.symbol} value={token.symbol} className="bg-gray-800">
                  {token.symbol} - {token.name}
                </option>
              ))}
            </select>
          </div>

          {/* Token B Selection */}
          <div>
            <label className="text-sm text-gray-300 mb-2 block">Second Token</label>
            <select
              onChange={e => {
                const token = AVAILABLE_TOKENS.find(t => t.symbol === e.target.value);
                setTokenB(token || null);
              }}
              className="w-full bg-black/20 border border-white/20 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-white/50 focus:border-transparent"
            >
              <option value="" className="bg-gray-800">
                Select second token
              </option>
              {AVAILABLE_TOKENS.filter(t => t.symbol !== tokenA?.symbol).map(token => (
                <option key={token.symbol} value={token.symbol} className="bg-gray-800">
                  {token.symbol} - {token.name}
                </option>
              ))}
            </select>
          </div>

          {/* Pair Status */}
          {tokenA && tokenB && (
            <div className="bg-white/10 rounded-xl p-4 border border-white/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={tokenA.logo} alt={tokenA.symbol} className="w-6 h-6 rounded-full" />
                  <span className="text-white font-medium">{tokenA.symbol}</span>
                  <span className="text-gray-400">↔</span>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={tokenB.logo} alt={tokenB.symbol} className="w-6 h-6 rounded-full" />
                  <span className="text-white font-medium">{tokenB.symbol}</span>
                </div>

                {pairExists ? (
                  <div className="flex items-center gap-2">
                    <Badge className="bg-green-500/20 border-green-400/50 text-green-300">Pair Exists</Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-blue-400 hover:text-blue-300"
                      onClick={() => window.open(`https://etherscan.io/address/${existingPair}`, "_blank")}
                    >
                      <ExternalLink className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <Badge variant="outline" className="bg-yellow-500/20 border-yellow-400/50 text-yellow-300">
                    Pair Not Found
                  </Badge>
                )}
              </div>
            </div>
          )}

          {/* Action Button */}
          <Button
            onClick={handleCreatePair}
            disabled={Boolean(!tokenA || !tokenB || pairExists || isCreatingPair || !address)}
            className="w-full bg-white hover:bg-gray-200 text-black font-semibold py-3 rounded-2xl"
          >
            {(() => {
              if (!address) return "Connect Wallet";
              if (!tokenA) return "Select First Token";
              if (!tokenB) return "Select Second Token";
              if (pairExists) return "Pair Already Exists";
              if (isCreatingPair)
                return (
                  <span className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                    Creating Pair...
                  </span>
                );
              return (
                <span className="flex items-center gap-2">
                  <Plus className="w-4 h-4" />
                  Create {tokenA.symbol}/{tokenB.symbol} Pair
                </span>
              );
            })()}
          </Button>

          {/* Info */}
          <div className="bg-blue-500/10 rounded-xl p-3 border border-blue-400/30">
            <p className="text-blue-300 text-sm">
              💡 <strong>How it works:</strong> Create a trading pair between any two tokens. Once created, you can add
              liquidity and start trading!
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
