"use client";

import { useCallback, useEffect, useState } from "react";
import { ParticleBackground } from "./ParticleBackground";
import { StakeInterface } from "./StakeInterface";
import { TokenBridge } from "./TokenBridge";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "./ui/dropdown-menu";
import { Input } from "./ui/input";
import { Skeleton } from "./ui/skeleton";
import { ArrowUpDown, ChevronDown, RefreshCw, Settings } from "lucide-react";
import { formatEther, parseEther } from "viem";
import { useAccount, useBalance, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";

export const UniversalDex = () => {
  const { address: connectedAddress } = useAccount();

  // Working testnet addresses with liquidity
  const dexRouterAddress = "0x42Af1bCF6BD4876421b27c2a7Fcd9C8315cDA121"; // DEXRouter
  const dexFactoryAddress = "0x54D248E118983dDdDF4DAA605CBa832BA6F1eb4C";

  // Working token configuration with liquidity
  const tokens = [
    { symbol: "TRUST", name: "TRUST Token", logo: "/trust.png", address: "native", decimals: 18, isNative: true },
    { symbol: "INTUIT", name: "Intuit Token", logo: "/intuit.png?v=1", address: "0xe8bD8876CB6f97663c668faae65C4Da579FfA0B5", decimals: 18, isNative: false }
  ];

  const [fromToken, setFromToken] = useState(tokens[0]);
  const [toToken, setToToken] = useState(tokens[1]);
  const [fromAmount, setFromAmount] = useState("");
  const [toAmount, setToAmount] = useState("");
  const [slippage] = useState("0.5");
  const [isPollingReserves, setIsPollingReserves] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [activeMode, setActiveMode] = useState<"SWAP" | "STAKE" | "BRIDGE">("SWAP");
  const [transactionStep, setTransactionStep] = useState<"idle" | "approving" | "swapping" | "confirmed">("idle");

  // ERC20 ABI for balance and approval
  const erc20Abi = [
    {
      name: "balanceOf",
      type: "function",
      stateMutability: "view",
      inputs: [{ name: "account", type: "address" }],
      outputs: [{ name: "", type: "uint256" }],
    },
    {
      name: "approve",
      type: "function",
      stateMutability: "nonpayable",
      inputs: [
        { name: "spender", type: "address" },
        { name: "amount", type: "uint256" }
      ],
      outputs: [{ name: "", type: "bool" }],
    },
    {
      name: "allowance",
      type: "function",
      stateMutability: "view",
      inputs: [
        { name: "owner", type: "address" },
        { name: "spender", type: "address" }
      ],
      outputs: [{ name: "", type: "uint256" }],
    }
  ];

  // DEXRouter ABI (simplified)
  const routerAbi = [
    {
      name: "WETH",
      type: "function", 
      stateMutability: "view",
      inputs: [],
      outputs: [{ name: "", type: "address" }],
    },
    {
      name: "getAmountsOut",
      type: "function",
      stateMutability: "view",
      inputs: [
        { name: "amountIn", type: "uint256" },
        { name: "path", type: "address[]" }
      ],
      outputs: [{ name: "amounts", type: "uint256[]" }],
    },
    {
      name: "swapExactTokensForTokens",
      type: "function",
      stateMutability: "nonpayable",
      inputs: [
        { name: "amountIn", type: "uint256" },
        { name: "amountOutMin", type: "uint256" },
        { name: "path", type: "address[]" },
        { name: "to", type: "address" },
        { name: "deadline", type: "uint256" }
      ],
      outputs: [{ name: "amounts", type: "uint256[]" }],
    },
    {
      name: "swapExactETHForTokens",
      type: "function",
      stateMutability: "payable",
      inputs: [
        { name: "amountOutMin", type: "uint256" },
        { name: "path", type: "address[]" },
        { name: "to", type: "address" },
        { name: "deadline", type: "uint256" }
      ],
      outputs: [{ name: "amounts", type: "uint256[]" }],
    },
    {
      name: "swapExactTokensForETH",
      type: "function",
      stateMutability: "nonpayable",
      inputs: [
        { name: "amountIn", type: "uint256" },
        { name: "amountOutMin", type: "uint256" },
        { name: "path", type: "address[]" },
        { name: "to", type: "address" },
        { name: "deadline", type: "uint256" }
      ],
      outputs: [{ name: "amounts", type: "uint256[]" }],
    }
  ];

  // Get WETH address directly from router
  const { data: wethAddress } = useReadContract({
    address: dexRouterAddress as `0x${string}`,
    abi: routerAbi,
    functionName: "WETH",
  });

  // Get user balance for selected tokens (native vs ERC20)
  const { data: fromTokenBalance, refetch: refetchFromBalance } = fromToken.isNative
    ? useBalance({ address: connectedAddress, chainId: 13579 })
    : useReadContract({
        address: fromToken.address as `0x${string}`,
        abi: erc20Abi,
        functionName: "balanceOf",
        args: [connectedAddress as `0x${string}`],
        query: { enabled: !!connectedAddress && !!fromToken.address },
      });

  const { data: toTokenBalance, refetch: refetchToBalance } = toToken.isNative
    ? useBalance({ address: connectedAddress, chainId: 13579 })
    : useReadContract({
        address: toToken.address as `0x${string}`,
        abi: erc20Abi,
        functionName: "balanceOf",
        args: [connectedAddress as `0x${string}`],
        query: { enabled: !!connectedAddress && !!toToken.address },
      });

  // Get allowance
  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: fromToken.address as `0x${string}`,
    abi: erc20Abi,
    functionName: "allowance",
    args: [connectedAddress as `0x${string}`, dexRouterAddress as `0x${string}`],
    query: { enabled: !!connectedAddress },
  });

  // Helper function to parse amounts based on token decimals
  const parseTokenAmount = (amount: string, decimals: number) => {
    if (!amount || amount === "0") return BigInt(0);
    if (decimals === 18) return parseEther(amount);
    return BigInt(Math.floor(parseFloat(amount) * Math.pow(10, decimals)));
  };

  // Helper to get token address for DEX (use WETH for native TRUST)
  const getTokenAddress = (token: typeof tokens[0]) => {
    return token.isNative ? (wethAddress || "0x0") : token.address;
  };

  // Get quote from router
  const { data: amountsOut, error: quoteError, isLoading: isQuoteLoading } = useReadContract({
    address: dexRouterAddress as `0x${string}`,
    abi: routerAbi,
    functionName: "getAmountsOut",
    args: [
      parseTokenAmount(fromAmount, fromToken.decimals),
      [getTokenAddress(fromToken), getTokenAddress(toToken)]
    ],
    query: { enabled: !!fromAmount && fromAmount !== "0" && parseFloat(fromAmount) > 0 && !!wethAddress },
  });

  // Debug logging (only when there's an amount)
  if (fromAmount && parseFloat(fromAmount) > 0) {
    console.log("Debug getAmountsOut:", {
      fromAmount,
      fromToken: fromToken.symbol,
      toToken: toToken.symbol,
      fromAddress: getTokenAddress(fromToken),
      toAddress: getTokenAddress(toToken),
      amountsOut,
      quoteError: quoteError?.message,
      isQuoteLoading
    });
  }


  // Write contracts
  const { writeContract, isPending: isWritePending, data: writeData } = useWriteContract();

  // Wait for transaction receipt
  const { isLoading: isConfirming, isSuccess: isConfirmed, isError: isTxError } = useWaitForTransactionReceipt({
    hash: writeData,
  });

  // Update toAmount when quote changes with calculation delay for UX
  useEffect(() => {
    if (amountsOut && Array.isArray(amountsOut) && amountsOut.length > 1) {
      setIsCalculating(true);
      setTimeout(() => {
        const outputAmount = formatTokenAmount(amountsOut[1], toToken.decimals);
        setToAmount(outputAmount);
        setIsCalculating(false);
      }, 500); // Délai réduit pour meilleure UX
    } else {
      setToAmount("");
      setIsCalculating(false);
    }
  }, [amountsOut, toToken.decimals]);

  // Initial loading management
  useEffect(() => {
    if (amountsOut !== undefined) {
      setIsInitialLoading(false);
    }
  }, [amountsOut]);

  // Handle token swap positions
  const handleSwapTokens = useCallback(() => {
    setFromToken(toToken);
    setToToken(fromToken);
    setFromAmount(toAmount);
    setToAmount("");
  }, [fromToken, toToken, toAmount]);

  // Handle input amount change with calculation delay
  const handleFromAmountChange = (value: string) => {
    setFromAmount(value);
    if (!value) {
      setToAmount("");
      setIsCalculating(false);
    }
  };

  // Handle approve
  const handleApprove = useCallback(async () => {
    if (!fromAmount) return;
    
    try {
      setTransactionStep("approving");
      const amount = parseTokenAmount(fromAmount, fromToken.decimals);
      
      writeContract({
        address: fromToken.address as `0x${string}`,
        abi: erc20Abi,
        functionName: "approve",
        args: [dexRouterAddress as `0x${string}`, amount],
        gas: 100000n,
      });
    } catch (error) {
      console.error("Approve failed:", error);
      setTransactionStep("idle");
    }
  }, [writeContract, fromToken.address, fromToken.decimals, fromAmount]);

  // Check if approval is needed (native tokens don't need approval)
  const needsApproval = fromToken.isNative ? false : 
    (allowance && fromAmount ? allowance < parseTokenAmount(fromAmount, fromToken.decimals) : true);

  // Handle swap execution
  const handleSwap = useCallback(async () => {
    if (!fromAmount || !connectedAddress) return;

    const deadline = Math.floor(Date.now() / 1000) + 1200; // 20 minutes
    const amountIn = parseTokenAmount(fromAmount, fromToken.decimals);
    const amountOutMin = amountsOut && amountsOut[1] ? (amountsOut[1] * BigInt(95)) / BigInt(100) : BigInt(0); // 5% slippage
    
    try {
      if (needsApproval) {
        await handleApprove();
      } else {
        setTransactionStep("swapping");
        
        // Use different swap functions based on token types
        if (fromToken.isNative) {
          // TRUST -> INTUIT: use swapExactETHForTokens
          writeContract({
            address: dexRouterAddress as `0x${string}`,
            abi: routerAbi,
            functionName: "swapExactETHForTokens",
            args: [
              amountOutMin,
              [getTokenAddress(fromToken), toToken.address],
              connectedAddress,
              BigInt(deadline)
            ],
            value: amountIn, // Send ETH/TRUST value
            gas: 300000n,
          });
        } else if (toToken.isNative) {
          // INTUIT -> TRUST: use swapExactTokensForETH  
          writeContract({
            address: dexRouterAddress as `0x${string}`,
            abi: routerAbi,
            functionName: "swapExactTokensForETH",
            args: [
              amountIn,
              amountOutMin,
              [fromToken.address, getTokenAddress(toToken)],
              connectedAddress,
              BigInt(deadline)
            ],
            gas: 300000n,
          });
        } else {
          // ERC20 -> ERC20: use swapExactTokensForTokens
          writeContract({
            address: dexRouterAddress as `0x${string}`,
            abi: routerAbi,
            functionName: "swapExactTokensForTokens",
            args: [
              amountIn,
              amountOutMin,
              [fromToken.address, toToken.address],
              connectedAddress,
              BigInt(deadline)
            ],
            gas: 300000n,
          });
        }
      }
    } catch (error) {
      console.error("Swap failed:", error);
      setTransactionStep("idle");
    }
  }, [writeContract, fromAmount, connectedAddress, amountsOut, fromToken.address, fromToken.decimals, toToken.address, needsApproval, handleApprove]);

  // Format balance display
  const formatBalance = (balance: any, decimals: number, isNative = false) => {
    if (!balance) return "0";
    
    // Handle native balance (from useBalance)
    if (isNative && balance?.value) {
      return parseFloat(formatEther(balance.value)).toString();
    }
    
    // Handle ERC20 balance (from useReadContract)
    const balanceValue = balance?.value || balance;
    if (!balanceValue) return "0";
    
    if (decimals === 18) {
      return parseFloat(formatEther(balanceValue)).toString();
    }
    return (Number(balanceValue) / Math.pow(10, decimals)).toString();
  };

  // Format token amount for display (used for swap amounts)
  const formatTokenAmount = (amount: bigint, decimals: number) => {
    if (!amount) return "0";
    
    if (decimals === 18) {
      return parseFloat(formatEther(amount)).toString();
    }
    return (Number(amount) / Math.pow(10, decimals)).toString();
  };

  // Get balance for a token (same logic as formatBalance but simplified)
  const getBalance = (token: typeof tokens[0]) => {
    const balance = token === fromToken ? fromTokenBalance : toTokenBalance;
    if (!balance) return "0";
    
    if (token.isNative && balance?.value) {
      return parseFloat(formatEther(balance.value)).toString();
    }
    
    const balanceValue = balance?.value || balance;
    if (!balanceValue) return "0";
    
    if (token.decimals === 18) {
      return parseFloat(formatEther(balanceValue)).toString();
    }
    return (Number(balanceValue) / Math.pow(10, token.decimals)).toString();
  };

  const isSwapping = isWritePending || transactionStep !== "idle";

  // Handle transaction confirmations and errors
  useEffect(() => {
    if (isConfirmed && transactionStep !== "idle") {
      if (transactionStep === "approving") {
        // Refresh allowance after approval
        refetchAllowance();
        setTimeout(() => {
          setTransactionStep("swapping");
          const deadline = Math.floor(Date.now() / 1000) + 1200;
          const amountIn = parseTokenAmount(fromAmount, fromToken.decimals);
          const amountOutMin = amountsOut && amountsOut[1] ? (amountsOut[1] * BigInt(90)) / BigInt(100) : BigInt(0); // 10% slippage instead of 5%
          
          writeContract({
            address: dexRouterAddress as `0x${string}`,
            abi: routerAbi,
            functionName: "swapExactTokensForTokens",
            args: [
              amountIn,
              amountOutMin,
              [fromToken.address, toToken.address],
              connectedAddress,
              BigInt(deadline)
            ],
            gas: 300000n,
          });
        }, 2000); // Plus de temps pour que l'allowance soit mise à jour
      } else {
        setTransactionStep("confirmed");
        setTimeout(() => {
          setTransactionStep("idle");
          setFromAmount("");
          setToAmount("");
          // Refresh balances and allowance
          refetchFromBalance();
          refetchToBalance();
          refetchAllowance();
        }, 2000);
      }
    }
  }, [isConfirmed, transactionStep, fromToken, fromAmount, toToken, connectedAddress, amountsOut, writeContract, refetchFromBalance, refetchToBalance, refetchAllowance]);

  // Handle transaction errors
  useEffect(() => {
    if (isTxError && transactionStep !== "idle") {
      console.error("Transaction failed");
      setTimeout(() => {
        setTransactionStep("idle");
      }, 1000);
    }
  }, [isTxError, transactionStep]);

  return (
    <div className="h-full bg-black flex items-center justify-center p-4 relative overflow-hidden">
      <ParticleBackground />
      <div className="w-full relative z-10 max-h-full overflow-y-auto max-w-md">
        {/* Mode Toggle */}
        <div className="mb-6">
          <div className="bg-white/5 border border-white/20 backdrop-blur-xl rounded-2xl p-1 flex">
            <button
              onClick={() => setActiveMode("SWAP")}
              className={`flex-1 py-2 px-4 rounded-xl font-semibold transition-all duration-200 text-sm ${
                activeMode === "SWAP" ? "bg-white text-black shadow-lg" : "text-white hover:bg-white/10"
              }`}
            >
              SWAP
            </button>
            <button
              onClick={() => setActiveMode("STAKE")}
              className={`flex-1 py-2 px-4 rounded-xl font-semibold transition-all duration-200 text-sm ${
                activeMode === "STAKE" ? "bg-white text-black shadow-lg" : "text-white hover:bg-white/10"
              }`}
            >
              STAKE
            </button>
            <button
              onClick={() => setActiveMode("BRIDGE")}
              className={`flex-1 py-2 px-4 rounded-xl font-semibold transition-all duration-200 text-sm ${
                activeMode === "BRIDGE" ? "bg-white text-black shadow-lg" : "text-white hover:bg-white/10"
              }`}
            >
              BRIDGE
            </button>
          </div>
        </div>

        {/* Main Interface */}
        {activeMode === "SWAP" ? (
          <Card className="bg-white/5 border-white/20 backdrop-blur-2xl shadow-2xl shadow-white/10 before:absolute before:inset-0 before:bg-gradient-to-br before:from-white/10 before:to-transparent before:rounded-lg before:pointer-events-none">
            <CardContent className="p-6">
              {/* Settings */}
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-white"></h2>
                <div className="flex items-center gap-2">
                  <Badge
                    asChild
                    variant="outline"
                    className="bg-blue-500/20 border-blue-400/50 text-blue-300 hover:bg-blue-500/30 cursor-pointer transition-colors text-xs px-2 py-1"
                  >
                    <span>{tokens.length} tokens</span>
                  </Badge>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white">
                        <Settings className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="bg-gray-800 border-gray-700">
                      <DropdownMenuItem className="text-white">Slippage: {slippage}%</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              {/* From Token */}
              <div className="space-y-4">
                <div className="bg-white/10 rounded-2xl p-4 border border-white/30 backdrop-blur-xl shadow-lg shadow-black/20">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-gray-300">From</span>
                    <span className="text-sm text-gray-300">
                      Balance: {parseFloat(formatBalance(fromTokenBalance, fromToken.decimals, fromToken.isNative) || "0").toFixed(4)}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Input
                      type="number"
                      placeholder="0.0"
                      value={fromAmount}
                      onChange={e => handleFromAmountChange(e.target.value)}
                      className="bg-black/20 border border-white/20 text-2xl font-semibold text-white placeholder-gray-400 p-3 h-auto focus-visible:ring-2 focus-visible:ring-white/50 rounded-xl"
                    />
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          className="bg-gray-700 hover:bg-gray-600 text-white rounded-full px-4 py-2"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={fromToken.logo} alt={fromToken.symbol} className="w-5 h-5 mr-2 rounded-full" />
                          {fromToken.symbol}
                          <ChevronDown className="w-4 h-4 ml-2" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="bg-gray-800 border-gray-700">
                        {tokens.filter(t => t.address !== toToken.address).map((token) => (
                          <DropdownMenuItem
                            key={token.address}
                            onClick={() => setFromToken(token)}
                            className="text-white hover:bg-gray-700"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={token.logo} alt={token.symbol} className="w-4 h-4 mr-2 rounded-full" />
                            <div>
                              <div>{token.symbol}</div>
                              <div className="text-xs text-gray-500">{token.name}</div>
                            </div>
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {/* Percentage Buttons */}
                  <div className="flex gap-2 mt-3">
                    {[5, 10, 25, 50, 100].map(percentage => (
                      <Button
                        key={percentage}
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          const balance = parseFloat(formatBalance(fromTokenBalance, fromToken.decimals, fromToken.isNative) || "0");
                          const amount = ((balance * percentage) / 100).toString();
                          handleFromAmountChange(amount);
                        }}
                        className="bg-white/10 hover:bg-white/20 text-white text-xs px-3 py-1 rounded-lg border border-white/20 flex-1 min-h-[32px]"
                      >
                        {percentage === 100 ? "MAX" : `${percentage}%`}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Swap Button */}
                <div className="flex justify-center">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleSwapTokens}
                    className="bg-gray-800 hover:bg-gray-700 rounded-full p-2 border border-gray-700"
                  >
                    <ArrowUpDown className="w-4 h-4 text-gray-400" />
                  </Button>
                </div>

                {/* To Token */}
                <div className="bg-white/10 rounded-2xl p-4 border border-white/30 backdrop-blur-xl shadow-lg shadow-black/20">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-gray-300">To</span>
                    <span className="text-sm text-gray-300">
                      Balance: {parseFloat(getBalance(toToken)).toFixed(4)}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    {isCalculating && fromAmount ? (
                      <Skeleton className="h-12 w-full bg-gray-700 rounded-xl" />
                    ) : (
                      <Input
                        type="number"
                        placeholder={
                          fromAmount && parseFloat(fromAmount) > 0 && amountsOut && Array.isArray(amountsOut) && amountsOut.length > 1
                            ? `~${formatTokenAmount(amountsOut[1], toToken.decimals)} ${toToken.symbol}`
                            : fromAmount && parseFloat(fromAmount) > 0
                              ? `Calculating...`
                              : "0.0"
                        }
                        value={toAmount}
                        readOnly
                        className="bg-black/20 border border-white/20 text-2xl font-semibold text-white placeholder-gray-400 p-3 h-auto focus-visible:ring-2 focus-visible:ring-white/50 rounded-xl cursor-default"
                      />
                    )}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          className="bg-gray-700 hover:bg-gray-600 text-white rounded-full px-4 py-2"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={toToken.logo} alt={toToken.symbol} className="w-5 h-5 mr-2 rounded-full" />
                          {toToken.symbol}
                          <ChevronDown className="w-4 h-4 ml-2" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="bg-gray-800 border-gray-700">
                        {tokens.filter(t => t.address !== fromToken.address).map((token) => (
                          <DropdownMenuItem
                            key={token.address}
                            onClick={() => setToToken(token)}
                            className="text-white hover:bg-gray-700"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={token.logo} alt={token.symbol} className="w-4 h-4 mr-2 rounded-full" />
                            <div>
                              <div>{token.symbol}</div>
                              <div className="text-xs text-gray-500">{token.name}</div>
                            </div>
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                {/* Price Info */}
                {fromAmount && toAmount && (
                  <div className="bg-white/5 rounded-xl p-3 text-sm text-gray-400 border border-white/20 backdrop-blur-xl shadow-lg shadow-black/20">
                    <div className="flex justify-between">
                      <span className="flex items-center gap-2">
                        Rate
                        {isPollingReserves && <RefreshCw className="w-3 h-3 animate-spin text-white" />}
                      </span>
                      {isPollingReserves || isCalculating ? (
                        <Skeleton className="h-4 w-32 bg-gray-700" />
                      ) : (
                        <span>
                          1 {fromToken.symbol} = {(parseFloat(toAmount) / parseFloat(fromAmount)).toFixed(6)}{" "}
                          {toToken.symbol}
                        </span>
                      )}
                    </div>
                    <div className="flex justify-between mt-1">
                      <span>Fee (0.3%)</span>
                      <span>
                        {(parseFloat(fromAmount) * 0.003).toFixed(6)} {fromToken.symbol}
                      </span>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="space-y-3">
                  {!connectedAddress ? (
                    <div className="text-center py-4">
                      <Button className="w-full bg-white hover:bg-gray-200 text-black font-semibold py-3 rounded-2xl">
                        Connect Wallet
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Button
                        onClick={handleSwap}
                        disabled={!fromAmount || isSwapping}
                        className="w-full bg-white hover:bg-gray-200 text-black font-semibold py-3 rounded-2xl relative overflow-hidden"
                      >
                        {transactionStep === "idle" && "Swap"}
                        {transactionStep === "approving" && (
                          <span className="flex items-center justify-center gap-2">
                            <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                            Approving {fromToken.symbol}...
                          </span>
                        )}
                        {transactionStep === "swapping" && (
                          <span className="flex items-center justify-center gap-2">
                            <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                            Swapping...
                          </span>
                        )}
                        {transactionStep === "confirmed" && (
                          <span className="flex items-center justify-center gap-2 text-green-400 font-semibold animate-pulse drop-shadow-[0_0_8px_rgba(34,197,94,0.8)]">
                            ✓ Transaction Confirmed!
                          </span>
                        )}
                      </Button>

                      {/* Transaction Status */}
                      {transactionStep !== "idle" && (
                        <div className="bg-white/5 rounded-xl p-3 text-sm border border-white/20 backdrop-blur-xl">
                          <div className="flex items-center justify-between">
                            <span className="text-gray-400">
                              {transactionStep === "approving" && "Step 1/2: Approving token spend..."}
                              {transactionStep === "swapping" && "Step 2/2: Executing swap..."}
                              {transactionStep === "confirmed" && "Swap completed successfully!"}
                            </span>
                            {isConfirming && (
                              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            )}
                          </div>
                          {transactionStep === "approving" && (
                            <div className="mt-2 text-xs text-gray-500">
                              Please confirm the approval transaction in your wallet
                            </div>
                          )}
                          {transactionStep === "swapping" && (
                            <div className="mt-2 text-xs text-gray-500">
                              Please confirm the swap transaction in your wallet
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ) : activeMode === "STAKE" ? (
          <StakeInterface />
        ) : activeMode === "BRIDGE" ? (
          <TokenBridge />
        ) : null}

        {/* Footer */}
        {activeMode === "SWAP" && (
          <div className="text-center mt-4 text-white text-xs">
            <p>TRUST ↔ INTUIT • 0.3% trading fee</p>
          </div>
        )}
      </div>
    </div>
  );
};