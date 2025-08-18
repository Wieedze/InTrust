"use client";

import { useState, useEffect, useRef } from "react";
import { parseEther, formatEther, parseUnits } from "viem";
import { useAccount, useBalance, useWriteContract, useReadContract, useWaitForTransactionReceipt } from "wagmi";
import { Card, CardContent } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Info, X } from "lucide-react";
import { Badge } from "./ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "./ui/tooltip";

export const StakeInterface = () => {
  const { address: connectedAddress } = useAccount();
  const [showStakingInfo, setShowStakingInfo] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  
  // Contract addresses for INTUITION testnet (Chain ID: 13579) - UPDATED with LATEST deployed contracts
  const intuitAddress = "0x3Aa5ebB10DC797CAC828524e59A333d0A371443c"; // INTUIT token (LATEST)
  const ttrustAddress = "0xA54b4E6e356b963Ee00d1C947f478d9194a1a210"; // TTRUST token
  const stakerAddress = "0x59b670e9fA9D0A427751Af201D676719a970857b"; // IntuitStaker contract (LATEST)
  
  // Available tokens for staking - IntuitStaker only supports INTUIT tokens
  const stakingTokens = [
    { 
      symbol: "INTUIT", 
      name: "Intuit Token", 
      address: intuitAddress,
      logo: "/intudex.png",
      apy: "12.5%",
      lockPeriod: "Immediate unstaking available"
    },
    // Note: TTRUST staking not supported by current IntuitStaker contract
    // { 
    //   symbol: "TTRUST", 
    //   name: "Testnet TRUST", 
    //   address: ttrustAddress,
    //   logo: "/intuition.png",
    //   apy: "8.5%",
    //   lockPeriod: "14 days"
    // },
  ];
  
  const [selectedToken, setSelectedToken] = useState(stakingTokens[0]); // Default to INTUIT
  const [stakeAmount, setStakeAmount] = useState("");
  const [activeTab, setActiveTab] = useState<"stake" | "unstake">("stake");
  const [transactionStep, setTransactionStep] = useState<"idle" | "approving" | "staking" | "confirmed">("idle");

  // Contract ABIs
  const erc20Abi = [
    {
      name: "approve",
      type: "function",
      stateMutability: "nonpayable",
      inputs: [{ name: "spender", type: "address" }, { name: "amount", type: "uint256" }],
      outputs: [{ name: "", type: "bool" }]
    },
    {
      name: "balanceOf",
      type: "function",
      stateMutability: "view",
      inputs: [{ name: "account", type: "address" }],
      outputs: [{ name: "", type: "uint256" }]
    }
  ] as const;

  const stakerAbi = [
    {
      name: "stake",
      type: "function",
      stateMutability: "nonpayable",
      inputs: [{ name: "amount", type: "uint256" }],
      outputs: []
    },
    {
      name: "unstake",
      type: "function", 
      stateMutability: "nonpayable",
      inputs: [{ name: "amount", type: "uint256" }],
      outputs: []
    },
    {
      name: "execute",
      type: "function",
      stateMutability: "nonpayable",
      inputs: [],
      outputs: []
    },
    {
      name: "claimRewards",
      type: "function",
      stateMutability: "nonpayable",
      inputs: [],
      outputs: []
    },
    {
      name: "getUserStakeInfo",
      type: "function",
      stateMutability: "view",
      inputs: [{ name: "user", type: "address" }],
      outputs: [
        { name: "stakedAmount", type: "uint256" },
        { name: "stakeTime", type: "uint256" },
        { name: "pendingRewards", type: "uint256" },
        { name: "canUnstakeWithoutFee", type: "bool" }
      ]
    },
    {
      name: "getStakingStatus",
      type: "function",
      stateMutability: "view",
      inputs: [],
      outputs: [
        { name: "currentStaked", type: "uint256" },
        { name: "thresholdAmount", type: "uint256" },
        { name: "timeRemaining", type: "uint256" },
        { name: "isCompleted", type: "bool" },
        { name: "withdrawalsOpen", type: "bool" },
        { name: "currentRewardPool", type: "uint256" }
      ]
    }
  ] as const;

  // Read TTRUST balance - try both native and ERC20 like swap interface
  const { data: ttrustBalanceERC20, refetch: refetchTtrustBalanceERC20 } = useBalance({
    address: connectedAddress,
    token: ttrustAddress as `0x${string}`,
    chainId: 13579, // INTUITION testnet
    query: { enabled: !!connectedAddress }
  });

  const { data: ttrustBalanceNative, refetch: refetchTtrustBalanceNative } = useBalance({
    address: connectedAddress,
    chainId: 13579, // INTUITION testnet
    query: { enabled: !!connectedAddress }
  });

  // Read INTUIT balance (using useReadContract like swap interface)
  const { data: intuitBalance, refetch: refetchIntuitBalance } = useReadContract({
    address: intuitAddress as `0x${string}`,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: [connectedAddress as `0x${string}`],
    query: { enabled: !!connectedAddress && selectedToken.symbol === "INTUIT" }
  });

  // Read user stake info
  const { data: userStakeInfo, refetch: refetchStakeInfo } = useReadContract({
    address: stakerAddress as `0x${string}`,
    abi: stakerAbi,
    functionName: "getUserStakeInfo",
    args: [connectedAddress as `0x${string}`],
    query: { enabled: !!connectedAddress }
  });

  // Read staking status
  const { data: stakingStatus, refetch: refetchStatus } = useReadContract({
    address: stakerAddress as `0x${string}`,
    abi: stakerAbi,
    functionName: "getStakingStatus",
    args: []
  });

  // Write contract functions
  const { writeContract, isPending: isWritePending, data: writeData } = useWriteContract();
  
  // Wait for transaction receipt
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash: writeData,
  });

  // Handle transaction success
  useEffect(() => {
    if (isConfirmed) {
      setTransactionStep("confirmed");
      // Refetch the appropriate balances based on selected token
      if (selectedToken.symbol === "TTRUST") {
        refetchTtrustBalanceNative();
        refetchTtrustBalanceERC20();
      } else {
        refetchIntuitBalance();
      }
      refetchStakeInfo();
      refetchStatus();
      
      setTimeout(() => {
        setTransactionStep("idle");
        setStakeAmount("");
      }, 3000);
    }
  }, [isConfirmed, selectedToken.symbol]);

  const handleStake = async () => {
    if (!stakeAmount) return;
    
    const amount = parseUnits(stakeAmount, 18);
    
    // Step 1: Approve selected tokens
    setTransactionStep("approving");
    writeContract({
      address: selectedToken.address as `0x${string}`,
      abi: erc20Abi,
      functionName: "approve",
      args: [stakerAddress as `0x${string}`, amount],
    });
  };

  // Handle the second step of staking after approval
  const handleStakeAfterApproval = () => {
    if (stakeAmount) {
      const amount = parseUnits(stakeAmount, 18);
      setTransactionStep("staking");
      writeContract({
        address: stakerAddress as `0x${string}`,
        abi: stakerAbi,
        functionName: "stake",
        args: [amount],
      });
    }
  };

  const handleUnstake = async () => {
    if (!stakeAmount) return;
    
    const amount = parseUnits(stakeAmount, 18);
    writeContract({
      address: stakerAddress as `0x${string}`,
      abi: stakerAbi,
      functionName: "unstake",
      args: [amount],
    });
  };

  const handleClaimRewards = async () => {
    writeContract({
      address: stakerAddress as `0x${string}`,
      abi: stakerAbi,
      functionName: "claimRewards",
      args: [],
    });
  };

  const handleExecute = async () => {
    writeContract({
      address: stakerAddress as `0x${string}`,
      abi: stakerAbi,
      functionName: "execute",
      args: [],
    });
  };

  // Auto-proceed to staking after approval
  useEffect(() => {
    if (transactionStep === "approving" && isConfirmed) {
      setTimeout(() => handleStakeAfterApproval(), 1000);
    }
  }, [transactionStep, isConfirmed]);

  const getTokenBalance = () => {
    if (selectedToken.symbol === "TTRUST") {
      // Try native balance first (since TTRUST might be the native token), then fall back to ERC20
      const balance = ttrustBalanceNative?.value || ttrustBalanceERC20?.value;
      return balance ? formatEther(balance) : "0";
    } else {
      return intuitBalance ? formatEther(intuitBalance) : "0";
    }
  };

  const getStakingData = () => {
    if (!stakingStatus || !userStakeInfo) {
      return {
        totalStaked: "0",
        userStaked: "0",
        apy: "12.5",
        rewards: "0",
        lockPeriod: "Immediate unstaking",
        threshold: "10,000",
        timeLeft: "0",
        progress: 0,
        canExecute: false
      };
    }

    const [currentStaked, thresholdAmount, timeRemaining, isCompleted, withdrawalsOpen, currentRewardPool] = stakingStatus;
    const [stakedAmount, stakeTime, pendingRewards, canUnstakeWithoutFee] = userStakeInfo;

    const progress = Number(formatEther(currentStaked)) / Number(formatEther(thresholdAmount)) * 100;
    const canExecute = timeRemaining === 0n && !isCompleted;

    return {
      totalStaked: Number(formatEther(currentStaked)).toLocaleString(),
      userStaked: formatEther(stakedAmount),
      apy: "12.5",
      rewards: formatEther(pendingRewards),
      lockPeriod: "7 days",
      threshold: Number(formatEther(thresholdAmount)).toLocaleString(),
      timeLeft: Number(timeRemaining),
      progress: Math.min(progress, 100),
      canExecute,
      isCompleted,
      withdrawalsOpen
    };
  };

  const stakingData = getStakingData();
  const isLoading = isWritePending || isConfirming;

  const formatTimeLeft = (seconds: number) => {
    if (seconds <= 0) return "Deadline reached";
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  // Handle ESC key and click outside to close modal
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setShowStakingInfo(false);
      }
    };

    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        setShowStakingInfo(false);
      }
    };

    if (showStakingInfo) {
      document.addEventListener('keydown', handleEscape);
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showStakingInfo]);

  return (
    <TooltipProvider>
      <div className="w-full">
      <Card className="bg-white/5 border-white/20 backdrop-blur-2xl shadow-2xl shadow-white/10 relative">
        <CardContent className="p-6">
          {/* Header */}
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-white mb-2">{selectedToken.symbol} Staking</h1>
            <p className="text-gray-400 text-sm">Stake {selectedToken.symbol} tokens to earn rewards</p>
          </div>

          {/* Stake/Unstake Toggle */}
          <div className="flex mb-6">
            <button
              onClick={() => setActiveTab("stake")}
              className={`flex-1 py-3 px-4 rounded-l-xl font-medium transition-all duration-200 ${
                activeTab === "stake"
                  ? "bg-white text-black shadow-lg"
                  : "bg-white/10 text-white hover:bg-white/20"
              }`}
            >
              Stake
            </button>
            <button
              onClick={() => setActiveTab("unstake")}
              className={`flex-1 py-3 px-4 rounded-r-xl font-medium transition-all duration-200 ${
                activeTab === "unstake"
                  ? "bg-white text-black shadow-lg"
                  : "bg-white/10 text-white hover:bg-white/20"
              }`}
            >
              Unstake
            </button>
          </div>

          {/* Amount Input */}
          <div className="bg-white/5 rounded-xl p-4 border border-white/20 backdrop-blur-xl shadow-lg shadow-black/20 mb-4">
            <div className="flex items-center justify-between mb-2">
              <Input
                type="number"
                placeholder="0.0"
                value={stakeAmount}
                onChange={(e) => setStakeAmount(e.target.value)}
                className="bg-transparent border-none text-2xl font-bold text-white placeholder-gray-500 p-0 h-auto focus-visible:ring-0 flex-1"
              />
              <div className="bg-gray-700 text-white rounded-full px-4 py-2 ml-3 flex items-center">
                <img src={selectedToken.logo} alt={selectedToken.symbol} className="w-5 h-5 mr-2 rounded-full" />
                {selectedToken.symbol}
              </div>
            </div>
            <div className="flex justify-between items-center text-sm mt-10">
              <div className="text-gray-400">
                Balance: {parseFloat(getTokenBalance()).toFixed(4)} {selectedToken.symbol}
              </div>
              {parseFloat(stakingData.userStaked) > 0 && (
                <Badge variant="outline" className="border-green-500/50 text-green-400 bg-green-500/10">
                  STAKED: {parseFloat(stakingData.userStaked).toFixed(2)} {selectedToken.symbol}
                </Badge>
              )}
              {activeTab === "unstake" && parseFloat(stakingData.userStaked) > 0 && (
                <button
                  onClick={() => setStakeAmount(stakingData.userStaked)}
                  className="text-blue-400 hover:text-blue-300 font-medium transition-colors ml-2"
                >
                  Max
                </button>
              )}
            </div>
            

          </div>

          {/* Pool Info */}
          <div className="bg-white/5 rounded-xl p-4 border border-white/20 backdrop-blur-xl shadow-lg shadow-black/20 mb-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex flex-col">
                <div className="flex items-center gap-1">
                  <span className="text-gray-400">APY</span>
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="w-3 h-3 text-gray-500 hover:text-gray-300" />
                    </TooltipTrigger>
                    <TooltipContent className="bg-gray-800 border-gray-700 text-gray-200">
                      <div className="text-xs max-w-48">
                        <div className="font-semibold mb-1">12.5% APY Details:</div>
                        <div>• Collective goal: 10,000+ INTUIT staked</div>
                        <div>• Reward pool: 180,000 INTUIT tokens</div>
                        <div>• Distributed proportionally to all stakers</div>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <span className="text-white font-semibold">{selectedToken.apy}</span>
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-1">
                  <span className="text-gray-400">Lock Period</span>
                  <button
                    onClick={() => setShowStakingInfo(!showStakingInfo)}
                  >
                    <Info className="w-3 h-3 text-gray-500 hover:text-gray-300 cursor-pointer" />
                  </button>
                </div>
                <span className="text-white font-semibold">{selectedToken.lockPeriod}</span>
              </div>
            </div>
            

          </div>



          {/* Pool Statistics */}
          <div className="bg-white/5 rounded-xl p-4 border border-white/20 backdrop-blur-xl shadow-lg shadow-black/20 mb-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex flex-col">
                <span className="text-gray-400">Total Staked</span>
                <span className="text-white font-semibold">{stakingData.totalStaked} {selectedToken.symbol}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-gray-400">Pending Rewards</span>
                <span className="text-green-400 font-semibold">{parseFloat(stakingData.rewards).toFixed(4)} {selectedToken.symbol}</span>
              </div>
            </div>
          </div>

          {/* Action Button */}
          <Button
            onClick={activeTab === "stake" ? handleStake : handleUnstake}
            disabled={!stakeAmount || isLoading || !connectedAddress}
            className="w-full bg-white hover:bg-gray-200 text-black font-semibold py-3 rounded-xl text-base"
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                {transactionStep === "approving" ? "Approving..." : activeTab === "stake" ? "Staking..." : "Unstaking..."}
              </span>
            ) : (
              `${activeTab === "stake" ? "Stake" : "Unstake"} ${selectedToken.symbol}`
            )}
          </Button>

          {/* Claim Rewards Button - Show in both stake and unstake tabs */}
          {(activeTab === "stake" || activeTab === "unstake") && (
            <Button
              onClick={handleClaimRewards}
              disabled={isLoading || !connectedAddress || parseFloat(stakingData.rewards) === 0}
              className={`w-full font-semibold py-3 rounded-xl text-base mt-3 ${
                parseFloat(stakingData.rewards) > 0 
                  ? "bg-green-600 hover:bg-green-700 text-white" 
                  : "bg-gray-600 text-gray-400 cursor-not-allowed"
              }`}
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Claiming Rewards...
                </span>
              ) : parseFloat(stakingData.rewards) > 0 ? (
                `Claim ${parseFloat(stakingData.rewards).toFixed(4)} ${selectedToken.symbol} Rewards`
              ) : (
                `No Rewards Available`
              )}
            </Button>
          )}

          {/* Transaction Status */}
          {transactionStep !== "idle" && (
            <div className="mt-4 p-3 bg-white/5 rounded-xl border border-white/20 backdrop-blur-xl">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">
                  {transactionStep === "approving" && `Step 1/2: Approving ${selectedToken.symbol} spend...`}
                  {transactionStep === "staking" && "Step 2/2: Executing stake..."}
                  {transactionStep === "confirmed" && "Transaction completed successfully!"}
                </span>
                {isConfirming && (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                )}
              </div>
            </div>
          )}
        </CardContent>
        
        {/* Modal Overlay */}
        {showStakingInfo && (
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div 
              ref={modalRef}
              className="bg-gray-800 border border-gray-700 rounded-xl p-6 max-w-md w-full relative"
            >
              {/* Close Button */}
              <button
                onClick={() => setShowStakingInfo(false)}
                className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
              
              {/* Modal Content */}
              <div className="text-gray-200 pr-8">
                <div className="text-sm space-y-3">
                  <div className="font-semibold text-lg mb-4">🎯 How INTUIT Staking Works</div>
                  <div>• <strong>Single-sided staking:</strong> Only INTUIT tokens needed (no TTRUST required)</div>
                  <div>• <strong>Collective goal:</strong> 10,000+ INTUIT total unlocks 12.5% APY rewards</div>
                  <div>• <strong>Reward pool:</strong> 180,000 INTUIT (18% of total supply) distributed proportionally</div>
                  <div>• <strong>Immediate unstaking:</strong> Withdraw anytime during staking period</div>
                  <div>• <strong>No impermanent loss:</strong> Your INTUIT amount never changes</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </Card>
    </div>
    </TooltipProvider>
  );
};
