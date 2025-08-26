"use client";

import { useCallback, useEffect, useState } from "react";
import { PairManager } from "./PairManager";
import { ParticleBackground } from "./ParticleBackground";
import { StakeInterface } from "./StakeInterface";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "./ui/dropdown-menu";
import { Input } from "./ui/input";
import { Skeleton } from "./ui/skeleton";
import { ArrowUpDown, ChevronDown, RefreshCw, Settings } from "lucide-react";
import { formatEther, parseEther, parseUnits } from "viem";
import { useAccount, useBalance, useReadContract, useWaitForTransactionReceipt, useWriteContract } from "wagmi";

export const DexInterface = () => {
  const { address: connectedAddress } = useAccount();

  // Contract addresses for INTUITION testnet (Chain ID: 13579) - Using NEW contracts
  const dexAddress = "0xc6e7DF5E7b4f2A278906862b61205850344D4e7d"; // IntuitDEX contract (NEW)
  const ttrustAddress = "0xA54b4E6e356b963Ee00d1C947f478d9194a1a210"; // Native TTRUST on INTUITION
  const intuitAddress = "0x3Aa5ebB10DC797CAC828524e59A333d0A371443c"; // INTUIT token (NEW)

  // Token configuration
  const tokens = [
    { symbol: "TTRUST", name: "Testnet TRUST", logo: "/intuition.png?v=1", address: ttrustAddress },
    { symbol: "INTUIT", name: "Intuit Token", logo: "/intudex.png?v=1", address: intuitAddress },
  ];

  const [fromToken, setFromToken] = useState(tokens[0]);
  const [toToken, setToToken] = useState(tokens[1]);
  const [fromAmount, setFromAmount] = useState("");
  const [toAmount, setToAmount] = useState("");
  const [slippage] = useState("0.5");
  const [isPollingReserves, setIsPollingReserves] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [activeMode, setActiveMode] = useState<"SWAP" | "STAKE" | "PAIRS">("SWAP");
  const [transactionStep, setTransactionStep] = useState<"idle" | "approving" | "swapping" | "confirmed">("idle");
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [txHash] = useState<string | undefined>();
  const [isPostTxPolling, setIsPostTxPolling] = useState(false);

  // Read contract data - try both native and ERC20 balance for TTRUST
  const { data: ttrustBalanceERC20, refetch: refetchTtrustBalanceERC20 } = useBalance({
    address: connectedAddress,
    token: ttrustAddress as `0x${string}`,
    chainId: 13579, // INTUITION testnet
  });

  const { data: ttrustBalanceNative, refetch: refetchTtrustBalanceNative } = useBalance({
    address: connectedAddress,
    chainId: 13579, // INTUITION testnet
  });

  // Direct contract read for INTUIT balance to avoid multicall issues
  const {
    data: intuitBalance,
    error: intuitBalanceError,
    isLoading: intuitBalanceLoading,
    refetch: refetchIntuitBalance,
  } = useReadContract({
    address: intuitAddress as `0x${string}`,
    abi: [
      {
        name: "balanceOf",
        type: "function",
        stateMutability: "view",
        inputs: [{ name: "account", type: "address" }],
        outputs: [{ name: "", type: "uint256" }],
      },
    ],
    functionName: "balanceOf",
    args: [connectedAddress as `0x${string}`],
    query: { enabled: !!connectedAddress },
  });

  const { data: dexTtrustBalance, refetch: refetchTtrustBalance } = useBalance({
    address: dexAddress as `0x${string}`,
    chainId: 13579, // INTUITION testnet
  });

  // Direct contract read for DEX INTUIT balance to avoid multicall issues
  const {
    data: dexIntuitBalance,
    error: dexIntuitBalanceError,
    isLoading: dexIntuitBalanceLoading,
    refetch: refetchDexIntuitBalance,
  } = useReadContract({
    address: intuitAddress as `0x${string}`,
    abi: [
      {
        name: "balanceOf",
        type: "function",
        stateMutability: "view",
        inputs: [{ name: "account", type: "address" }],
        outputs: [{ name: "", type: "uint256" }],
      },
    ],
    functionName: "balanceOf",
    args: [dexAddress as `0x${string}`],
  });

  // Contract ABIs (simplified)
  const erc20Abi = [
    {
      name: "approve",
      type: "function",
      stateMutability: "nonpayable",
      inputs: [
        { name: "spender", type: "address" },
        { name: "amount", type: "uint256" },
      ],
      outputs: [{ name: "", type: "bool" }],
    },
  ] as const;

  const intuitDexAbi = [
    {
      name: "swapTtrustForIntuit",
      type: "function",
      stateMutability: "payable",
      inputs: [],
      outputs: [{ name: "", type: "uint256" }],
    },
    {
      name: "swapIntuitForTtrust",
      type: "function",
      stateMutability: "nonpayable",
      inputs: [{ name: "intuitAmount", type: "uint256" }],
      outputs: [{ name: "", type: "uint256" }],
    },
    {
      name: "getAmountOut",
      type: "function",
      stateMutability: "pure",
      inputs: [
        { name: "inputAmount", type: "uint256" },
        { name: "inputReserve", type: "uint256" },
        { name: "outputReserve", type: "uint256" },
      ],
      outputs: [{ name: "", type: "uint256" }],
    },
    {
      name: "getReserves",
      type: "function",
      stateMutability: "view",
      inputs: [],
      outputs: [
        { name: "ttrustReserve", type: "uint256" },
        { name: "intuitReserve", type: "uint256" },
      ],
    },
  ] as const;

  // Write contract functions
  const { writeContract, isPending: isWritePending, data: writeData } = useWriteContract();

  // Wait for transaction receipt
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash: writeData,
  });

  // Real-time blockchain polling for pool reserves
  useEffect(() => {
    const pollReserves = async () => {
      setIsPollingReserves(true);
      try {
        await Promise.all([refetchTtrustBalance(), refetchDexIntuitBalance()]);
      } catch (error) {
        console.error("Error polling reserves:", error);
      } finally {
        setIsPollingReserves(false);
      }
    };

    // Poll immediately on mount
    pollReserves();

    // Set up interval to poll every 10 seconds
    const interval = setInterval(pollReserves, 10000);

    return () => clearInterval(interval);
  }, [refetchTtrustBalance, refetchDexIntuitBalance]);

  // Initial loading state management
  useEffect(() => {
    if (dexTtrustBalance !== undefined && dexIntuitBalance !== undefined) {
      setIsInitialLoading(false);
    }
  }, [dexTtrustBalance, dexIntuitBalance]);

  // Calculate price for swaps
  const calculatePrice = (inputAmount: string, inputReserve: bigint, outputReserve: bigint) => {
    if (!inputAmount || !inputReserve || !outputReserve) return "0";

    try {
      const input = parseEther(inputAmount);
      const inputWithFee = input * 997n;
      const numerator = inputWithFee * outputReserve;
      const denominator = inputReserve * 1000n + inputWithFee;
      const output = numerator / denominator;
      return formatEther(output);
    } catch {
      return "0";
    }
  };

  // Update output amount when input changes
  const handleFromAmountChange = (value: string) => {
    setFromAmount(value);

    if (value && dexTtrustBalance && dexIntuitBalance) {
      setIsCalculating(true);

      // Extended delay to show skeleton for 0.7 seconds
      setTimeout(() => {
        const isTtrustToIntuit = fromToken.symbol === "TTRUST";
        const outputAmount = isTtrustToIntuit
          ? calculatePrice(value, dexTtrustBalance.value, dexIntuitBalance)
          : calculatePrice(value, dexIntuitBalance, dexTtrustBalance.value);
        setToAmount(outputAmount);
        setIsCalculating(false);
      }, 700);
    } else {
      setToAmount("");
      setIsCalculating(false);
    }
  };

  // Swap token positions
  const handleSwapTokens = () => {
    setFromToken(toToken);
    setToToken(fromToken);
    setFromAmount(toAmount);
    setToAmount(fromAmount);
  };

  // Handle swap execution
  const handleSwap = async () => {
    if (!fromAmount) return;

    if (fromToken.symbol === "TTRUST") {
      // TTRUST to INTUIT swap (payable)
      setTransactionStep("swapping");
      writeContract({
        address: dexAddress as `0x${string}`,
        abi: intuitDexAbi,
        functionName: "swapTtrustForIntuit",
        args: [],
        value: parseEther(fromAmount),
      });
    } else {
      // INTUIT to TTRUST swap (requires approval first)
      const amount = parseUnits(fromAmount, 18);

      // Step 1: Approve
      setTransactionStep("approving");
      writeContract({
        address: intuitAddress as `0x${string}`,
        abi: erc20Abi,
        functionName: "approve",
        args: [dexAddress as `0x${string}`, amount],
      });
    }
  };

  // Handle the second step of INTUIT swap after approval
  const handleIntuitSwap = useCallback(() => {
    if (fromToken.symbol === "INTUIT" && fromAmount) {
      const amount = parseUnits(fromAmount, 18);
      setTransactionStep("swapping");
      writeContract({
        address: dexAddress as `0x${string}`,
        abi: intuitDexAbi,
        functionName: "swapIntuitForTtrust",
        args: [amount],
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromToken.symbol, fromAmount, writeContract]);

  // Helper functions
  const getBalance = (token: (typeof tokens)[0]) => {
    if (token.symbol === "TTRUST") {
      // Try native balance first (since TTRUST might be the native token)
      const balance = ttrustBalanceNative?.value || ttrustBalanceERC20?.value;
      return balance ? formatEther(balance) : "0";
    } else {
      // Handle loading state
      if (intuitBalanceLoading) return "Loading...";

      // Handle error state
      if (intuitBalanceError) {
        console.error("INTUIT Balance Error:", intuitBalanceError);
        return "Error";
      }

      return intuitBalance ? formatEther(intuitBalance) : "0";
    }
  };

  const isSwapping = isWritePending || transactionStep !== "idle";

  // Post-transaction balance polling
  useEffect(() => {
    if (isPostTxPolling) {
      const pollUserBalances = async () => {
        try {
          await Promise.all([
            refetchTtrustBalanceERC20(),
            refetchTtrustBalanceNative(),
            refetchIntuitBalance(),
            refetchTtrustBalance(),
            refetchDexIntuitBalance(),
          ]);
        } catch (error) {
          console.error("Error polling user balances:", error);
        }
      };

      // Poll immediately
      pollUserBalances();

      // Then poll every 3 seconds for 10 seconds
      const interval = setInterval(pollUserBalances, 3000);
      const timeout = setTimeout(() => {
        clearInterval(interval);
        setIsPostTxPolling(false);
      }, 10000);

      return () => {
        clearInterval(interval);
        clearTimeout(timeout);
      };
    }
  }, [
    isPostTxPolling,
    refetchTtrustBalanceERC20,
    refetchTtrustBalanceNative,
    refetchIntuitBalance,
    refetchTtrustBalance,
    refetchDexIntuitBalance,
  ]);

  // Update transaction step based on confirmation status
  useEffect(() => {
    if (isConfirmed && transactionStep !== "idle") {
      if (transactionStep === "approving" && fromToken.symbol === "INTUIT") {
        // Approval confirmed, now execute the swap
        setTimeout(() => {
          handleIntuitSwap();
        }, 1000);
      } else {
        // Swap confirmed, show success and reset
        setTransactionStep("confirmed");
        // Start post-transaction polling
        setIsPostTxPolling(true);
        setTimeout(() => {
          setTransactionStep("idle");
          setFromAmount("");
          setToAmount("");
        }, 2000);
      }
    }
  }, [isConfirmed, transactionStep, fromToken.symbol, fromAmount, handleIntuitSwap]);

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
              onClick={() => setActiveMode("PAIRS")}
              className={`flex-1 py-2 px-4 rounded-xl font-semibold transition-all duration-200 text-sm ${
                activeMode === "PAIRS" ? "bg-white text-black shadow-lg" : "text-white hover:bg-white/10"
              }`}
            >
              PAIRS
            </button>
            <button
              onClick={() => setActiveMode("STAKE")}
              className={`flex-1 py-2 px-4 rounded-xl font-semibold transition-all duration-200 text-sm ${
                activeMode === "STAKE" ? "bg-white text-black shadow-lg" : "text-white hover:bg-white/10"
              }`}
            >
              STAKE
            </button>
          </div>
        </div>

        {/* Main Interface */}
        {activeMode === "SWAP" ? (
          <Card className="bg-white/5 border-white/20 backdrop-blur-2xl shadow-2xl shadow-white/10 before:absolute before:inset-0 before:bg-gradient-to-br before:from-white/10 before:to-transparent before:rounded-lg before:pointer-events-none">
            <CardContent className="p-6">
              {/* Settings */}
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-white">Swap</h2>
                <div className="flex items-center gap-2">
                  <Badge
                    asChild
                    variant="outline"
                    className="bg-blue-500/20 border-blue-400/50 text-blue-300 hover:bg-blue-500/30 cursor-pointer transition-colors text-xs px-2 py-1"
                  >
                    <a href="https://testnet.hub.intuition.systems/" target="_blank" rel="noopener noreferrer">
                      Faucet
                    </a>
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
                      Balance: {parseFloat(getBalance(fromToken)).toFixed(4)}
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
                        {tokens.map(token => (
                          <DropdownMenuItem
                            key={token.symbol}
                            onClick={() => setFromToken(token)}
                            className="text-white hover:bg-gray-700"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={token.logo} alt={token.symbol} className="w-4 h-4 mr-2 rounded-full" />
                            {token.symbol}
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
                          const balance = parseFloat(getBalance(fromToken));
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
                    <span className="text-sm text-gray-300">Balance: {parseFloat(getBalance(toToken)).toFixed(4)}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      {isCalculating || isInitialLoading ? (
                        <Skeleton className="h-12 w-full bg-gray-700 rounded-xl" />
                      ) : (
                        <Input
                          type="number"
                          placeholder="0.0"
                          value={toAmount}
                          readOnly
                          className="bg-black/20 border border-white/20 text-2xl font-semibold text-white placeholder-gray-400 p-3 h-auto focus-visible:ring-0 w-full rounded-xl"
                        />
                      )}
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          className="bg-gray-700 hover:bg-gray-600 text-white rounded-full px-4 py-2 flex-shrink-0"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={toToken.logo} alt={toToken.symbol} className="w-5 h-5 mr-2 rounded-full" />
                          {toToken.symbol}
                          <ChevronDown className="w-4 h-4 ml-2" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="bg-gray-800 border-gray-700">
                        {tokens.map(token => (
                          <DropdownMenuItem
                            key={token.symbol}
                            onClick={() => setToToken(token)}
                            className="text-white hover:bg-gray-700"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={token.logo} alt={token.symbol} className="w-4 h-4 mr-2 rounded-full" />
                            {token.symbol}
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
                          {fromToken.symbol === "INTUIT" && transactionStep === "approving" && (
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
        ) : activeMode === "PAIRS" ? (
          <PairManager />
        ) : (
          <StakeInterface />
        )}

        {/* Pool Stats - Only show for SWAP mode */}
        {activeMode === "SWAP" && (
          <div className="mt-2 grid grid-cols-2 gap-2 sm:mt-4 sm:gap-3">
            <Card className="bg-white/5 border-white/20 backdrop-blur-2xl shadow-2xl shadow-black/20 before:absolute before:inset-0 before:bg-gradient-to-br before:from-white/10 before:to-transparent before:rounded-lg before:pointer-events-none relative">
              <CardContent className="p-1.5 sm:p-4 text-center relative z-10 min-h-[10px] sm:min-h-0">
                <div className="text-sm sm:text-2xl font-bold text-white text-center leading-none">
                  {isInitialLoading ? (
                    <Skeleton className="h-3 sm:h-8 w-20 sm:w-24 bg-gray-700 mx-auto" />
                  ) : dexTtrustBalance ? (
                    parseFloat(formatEther(dexTtrustBalance.value)).toFixed(2)
                  ) : (
                    "0"
                  )}
                </div>
                <div className="text-[10px] sm:text-sm text-white leading-none mt-0.5 sm:mt-1">TTRUST Pool</div>
              </CardContent>
            </Card>
            <Card className="bg-white/5 border-white/20 backdrop-blur-2xl shadow-2xl shadow-black/20 before:absolute before:inset-0 before:bg-gradient-to-br before:from-white/10 before:to-transparent before:rounded-lg before:pointer-events-none relative">
              <CardContent className="p-1.5 sm:p-4 text-center relative z-10 min-h-[10px] sm:min-h-0">
                <div className="text-sm sm:text-2xl font-bold text-white text-center leading-none">
                  {dexIntuitBalanceLoading || isInitialLoading ? (
                    <Skeleton className="h-3 sm:h-8 w-20 sm:w-24 bg-gray-700 mx-auto" />
                  ) : dexIntuitBalanceError ? (
                    "Error"
                  ) : dexIntuitBalance ? (
                    parseFloat(formatEther(dexIntuitBalance)).toFixed(2)
                  ) : (
                    "0"
                  )}
                </div>
                <div className="text-[10px] sm:text-sm text-white leading-none mt-0.5 sm:mt-1">INTUIT Pool</div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Footer */}
        {activeMode === "SWAP" && (
          <div className="text-center mt-4 text-white text-xs">
            <p>Powered by Intuition Testnet • 0.3% trading fee</p>
          </div>
        )}
      </div>
    </div>
  );
};
