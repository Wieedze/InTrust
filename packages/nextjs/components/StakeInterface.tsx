"use client";

import { useState, useEffect, useRef } from "react";
import { parseEther, formatEther, parseUnits } from "viem";
import { useAccount, useBalance, useWriteContract, useReadContract, useWaitForTransactionReceipt } from "wagmi";
import { Card, CardContent } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Info, X, ChevronDown } from "lucide-react";
import { Badge } from "./ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "./ui/tooltip";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "./ui/dropdown-menu";

export const StakeInterface = () => {
  const { address: connectedAddress } = useAccount();
  const [showStakingInfo, setShowStakingInfo] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  
  // Latest deployed addresses with staking rewards
  const intuitStakingAddress = "0xCD8a1C3ba11CF5ECfa6267617243239504a98d90"; // INTUIT Staking contract
  const trustStakingAddress = "0x546a4E6BF6195A809632B528de28691BBFDb7507"; // TRUST Staking contract (FIXED)
  
  // Available staking tokens
  const stakingTokens = [
    { symbol: "TRUST", name: "TRUST Token", logo: "/trust.svg", address: "native", decimals: 18, isNative: true },
    { symbol: "INTUIT", name: "Intuit Token", logo: "/intuit.svg", address: "0x809d550fca64d94Bd9F66E60752A544199cfAC3D", decimals: 18, isNative: false }
  ];

  const trustStakingAbi = [
    {
      name: "stake",
      type: "function",
      stateMutability: "payable",
      inputs: [],
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
      name: "getUserStake",
      type: "function",
      stateMutability: "view",
      inputs: [{ name: "user", type: "address" }],
      outputs: [{ name: "amount", type: "uint256" }, { name: "pendingRewards", type: "uint256" }]
    },
    {
      name: "claimRewards",
      type: "function",
      stateMutability: "nonpayable",
      inputs: [],
      outputs: []
    }
  ] as const;
  
  const [selectedToken, setSelectedToken] = useState(stakingTokens[0]); // Default to TRUST
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

  const intuitStakingAbi = [
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

  // Read token balance dynamically based on selected token
  const { data: tokenBalance, refetch: refetchTokenBalance } = selectedToken.isNative
    ? useBalance({ 
        address: connectedAddress, 
        chainId: 13579,
        query: { enabled: !!connectedAddress }
      })
    : useReadContract({
        address: selectedToken.address as `0x${string}`,
        abi: erc20Abi,
        functionName: "balanceOf",
        args: [connectedAddress as `0x${string}`],
        query: { enabled: !!connectedAddress }
      });

  // Read user stake info (use appropriate contract based on selected token)
  const { data: userStakeInfo, refetch: refetchStakeInfo } = useReadContract({
    address: selectedToken.isNative ? trustStakingAddress : intuitStakingAddress,
    abi: selectedToken.isNative ? trustStakingAbi : intuitStakingAbi,
    functionName: "getUserStake",
    args: [connectedAddress as `0x${string}`],
    query: { enabled: !!connectedAddress }
  });

  // Read pool info for INTUIT staking
  const { data: poolInfo, refetch: refetchPoolInfo } = useReadContract({
    address: intuitStakingAddress as `0x${string}`,
    abi: intuitStakingAbi,
    functionName: "getUserStakeInfo",
    args: [connectedAddress as `0x${string}`],
    query: { enabled: selectedToken.symbol === "INTUIT" && !!connectedAddress }
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
      // Refetch all data
      refetchTokenBalance();
      refetchStakeInfo();
      if (refetchPoolInfo) refetchPoolInfo();
      
      // Force additional refresh after 2 seconds for unstaking
      setTimeout(() => {
        refetchStakeInfo();
        refetchTokenBalance();
      }, 2000);
      
      setTimeout(() => {
        setTransactionStep("idle");
        setStakeAmount("");
      }, 3000);
    }
  }, [isConfirmed, refetchTokenBalance, refetchStakeInfo, refetchPoolInfo]);

  const handleStake = async () => {
    console.log("🎯 Stake button clicked!");
    console.log("📊 Stake data:", {
      stakeAmount,
      selectedToken: selectedToken.symbol,
      tokenAddress: selectedToken.address,
      intuitStakingAddress,
      connectedAddress,
      isConnected: !!connectedAddress
    });
    
    if (!stakeAmount) {
      console.log("❌ No stake amount");
      return;
    }
    
    if (!connectedAddress) {
      console.log("❌ No connected address");
      return;
    }
    
    const amount = parseUnits(stakeAmount, 18);
    console.log("💰 Amount to stake (wei):", amount.toString());
    
    try {
      if (selectedToken.isNative) {
        // TRUST (native): Direct staking, no approval needed
        console.log("✅ Staking TRUST (native token)...");
        setTransactionStep("staking");
        writeContract({
          address: trustStakingAddress as `0x${string}`,
          abi: trustStakingAbi,
          functionName: "stake",
          value: amount, // Send TRUST value directly
          gas: 200000n,
        });
      } else {
        // INTUIT (ERC20): Need approval first
        console.log("✅ Starting approval for ERC20...");
        setTransactionStep("approving");
        writeContract({
          address: selectedToken.address as `0x${string}`,
          abi: erc20Abi,
          functionName: "approve",
          args: [intuitStakingAddress as `0x${string}`, amount],
          gas: 100000n,
        });
      }
    } catch (error) {
      console.error("❌ Stake error:", error);
      setTransactionStep("idle");
    }
  };

  // Handle the second step of staking after approval
  const handleStakeAfterApproval = () => {
    if (stakeAmount) {
      const amount = parseUnits(stakeAmount, 18);
      setTransactionStep("staking");
      writeContract({
        address: intuitStakingAddress as `0x${string}`,
        abi: intuitStakingAbi,
        functionName: "stake",
        args: [amount],
        gas: 200000n, // Limite gas stake
      });
    }
  };

  const handleUnstake = async () => {
    if (!stakeAmount) return;
    
    const amount = parseUnits(stakeAmount, 18);
    console.log("🔄 Unstaking:", {
      token: selectedToken.symbol,
      amount: stakeAmount,
      amountWei: amount.toString(),
      isNative: selectedToken.isNative
    });
    
    try {
      setTransactionStep("staking"); // Reuse "staking" step for unstaking UI
      
      if (selectedToken.isNative) {
        // TRUST unstaking via TrustStaking contract
        writeContract({
          address: trustStakingAddress as `0x${string}`,
          abi: trustStakingAbi,
          functionName: "unstake",
          args: [amount],
          gas: 200000n,
        });
      } else {
        // INTUIT unstaking via IntuitStaking contract
        writeContract({
          address: intuitStakingAddress as `0x${string}`,
          abi: intuitStakingAbi,
          functionName: "unstake",
          args: [amount],
          gas: 200000n,
        });
      }
    } catch (error) {
      console.error("❌ Unstake error:", error);
      setTransactionStep("idle");
    }
  };

  const handleClaimRewards = async () => {
    try {
      if (selectedToken.isNative) {
        // TRUST rewards via TrustStaking contract
        writeContract({
          address: trustStakingAddress as `0x${string}`,
          abi: trustStakingAbi,
          functionName: "claimRewards",
        });
      } else {
        // INTUIT rewards via IntuitStaking contract
        writeContract({
          address: intuitStakingAddress as `0x${string}`,
          abi: intuitStakingAbi,
          functionName: "claimRewards",
        });
      }
    } catch (error) {
      console.error("❌ Claim rewards error:", error);
    }
  };


  // Auto-proceed to staking after approval
  useEffect(() => {
    if (transactionStep === "approving" && isConfirmed) {
      setTimeout(() => handleStakeAfterApproval(), 1000);
    }
  }, [transactionStep, isConfirmed]);

  const getTokenBalance = () => {
    console.log(`💰 Balance pour ${selectedToken.symbol}:`, {
      tokenBalance,
      isNative: selectedToken.isNative,
      address: selectedToken.address,
      connected: !!connectedAddress
    });
    
    if (!tokenBalance) return "0";
    
    if (selectedToken.isNative && (tokenBalance as any)?.value) {
      const balance = formatEther((tokenBalance as any).value);
      console.log(`✅ Balance native ${selectedToken.symbol}:`, balance);
      return balance;
    }
    
    const balanceValue = (tokenBalance as any)?.value || tokenBalance;
    if (!balanceValue) return "0";
    
    if (selectedToken.decimals === 18) {
      const balance = formatEther(balanceValue);
      console.log(`✅ Balance ERC20 ${selectedToken.symbol}:`, balance);
      return balance;
    }
    return (Number(balanceValue) / Math.pow(10, selectedToken.decimals)).toString();
  };

  const getStakingData = () => {
    if (!userStakeInfo) {
      return {
        totalStaked: "0",
        userStaked: "0",
        rewards: "0",
        lockPeriod: "Immediate unstaking",
        minStakeAmount: "0"
      };
    }

    if (selectedToken.isNative) {
      // TrustStaking format: [amount, pendingRewards]
      const [stakedAmount, pendingRewards] = userStakeInfo;
      return {
        totalStaked: "N/A", // Not available in TrustStaking
        userStaked: formatEther(stakedAmount || 0n),
        rewards: formatEther(pendingRewards || 0n),
        lockPeriod: "Immediate unstaking",
        minStakeAmount: "1.0",
        canUnstake: true,
        isActive: true
      };
    } else {
      // IntuitStaking format: [stakedAmount, stakeTime, pendingRewards, canUnstake]
      if (!poolInfo) {
        return {
          totalStaked: "0",
          userStaked: "0",
          rewards: "0",
          lockPeriod: "Immediate unstaking",
          minStakeAmount: "0"
        };
      }
      
      const poolInfoArray = poolInfo as readonly [bigint, bigint, bigint, boolean];
      const userStakeInfoArray = userStakeInfo as readonly [bigint, bigint];
      const [, totalStaked, minStakeAmount] = poolInfoArray;
      const [stakedAmount] = userStakeInfoArray;
      return {
        totalStaked: Number(formatEther(totalStaked)).toLocaleString(),
        userStaked: formatEther(stakedAmount),
        rewards: "0", // formatEther(pendingRewards),
        lockPeriod: "Immediate unstaking",
        minStakeAmount: formatEther(minStakeAmount),
        canUnstake: true,
        isActive: true
      };
    }
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
        <CardContent className="p-4">
          {/* Header */}
          <div className="text-center mb-4">
            
            {/* Token Selector */}
            <div className="flex justify-center mb-3">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button className="bg-white/10 hover:bg-white/20 text-white border-white/20 text-sm py-1 px-3">
                    <img src={selectedToken.logo} alt={selectedToken.symbol} className="w-4 h-4 mr-2 rounded-full" />
                    {selectedToken.symbol}
                    <ChevronDown className="w-3 h-3 ml-2" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="bg-gray-800 border-gray-700">
                  {stakingTokens.map((token) => (
                    <DropdownMenuItem
                      key={token.address}
                      onClick={() => setSelectedToken(token)}
                      className="text-white hover:bg-gray-700"
                    >
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
            
            <p className="text-gray-400 text-xs">Stake {selectedToken.symbol} to earn rewards</p>
          </div>

          {/* Stake/Unstake Toggle */}
          <div className="flex mb-4">
            <button
              onClick={() => setActiveTab("stake")}
              className={`flex-1 py-2 px-3 rounded-l-xl font-medium transition-all duration-200 text-sm ${
                activeTab === "stake"
                  ? "bg-white text-black shadow-lg"
                  : "bg-white/10 text-white hover:bg-white/20"
              }`}
            >
              Stake
            </button>
            <button
              onClick={() => setActiveTab("unstake")}
              className={`flex-1 py-2 px-3 rounded-r-xl font-medium transition-all duration-200 text-sm ${
                activeTab === "unstake"
                  ? "bg-white text-black shadow-lg"
                  : "bg-white/10 text-white hover:bg-white/20"
              }`}
            >
              Unstake
            </button>
          </div>

          {/* Amount Input */}
          <div className="bg-white/5 rounded-xl p-3 border border-white/20 backdrop-blur-xl shadow-lg shadow-black/20 mb-3">
            <div className="flex items-center justify-between mb-2">
              <Input
                type="number"
                placeholder="0.0"
                value={stakeAmount}
                onChange={(e) => setStakeAmount(e.target.value)}
                className="bg-transparent border-none text-xl font-bold text-white placeholder-gray-500 p-0 h-auto focus-visible:ring-0 flex-1"
              />
              <div className="bg-gray-700 text-white rounded-full px-3 py-1 ml-3 flex items-center">
                <img src={selectedToken.logo} alt={selectedToken.symbol} className="w-4 h-4 mr-2 rounded-full" />
                <span className="text-sm">{selectedToken.symbol}</span>
              </div>
            </div>
            <div className="flex justify-between items-center text-sm mt-3">
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
          <div className="bg-white/5 rounded-xl p-3 border border-white/20 backdrop-blur-xl shadow-lg shadow-black/20 mb-3">
            <div className="grid grid-cols-2 gap-3 text-sm">
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
                <span className="text-white font-semibold">Variable</span>
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
                <span className="text-white font-semibold">{stakingData.lockPeriod}</span>
              </div>
            </div>
            

          </div>



          {/* Pool Statistics */}
          <div className="bg-white/5 rounded-xl p-3 border border-white/20 backdrop-blur-xl shadow-lg shadow-black/20 mb-3">
            <div className="grid grid-cols-2 gap-3 text-sm">
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
            className="w-full bg-white hover:bg-gray-200 text-black font-semibold py-2 rounded-xl text-sm"
            onMouseEnter={() => {
              console.log(`🔘 Bouton ${activeTab}:`, {
                stakeAmount,
                hasStakeAmount: !!stakeAmount,
                isLoading,
                connectedAddress: !!connectedAddress,
                disabled: !stakeAmount || isLoading || !connectedAddress,
                balance: getTokenBalance()
              });
            }}
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
              className={`w-full font-semibold py-2 rounded-xl text-sm mt-2 ${
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
            <div className="mt-2 p-2 bg-white/5 rounded-xl border border-white/20 backdrop-blur-xl">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-400">
                  {transactionStep === "approving" && "Approving..."}
                  {transactionStep === "staking" && "Processing..."}
                  {transactionStep === "confirmed" && "Completed!"}
                </span>
                {isConfirming && (
                  <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
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
              className="bg-gray-800 border border-gray-700 rounded-xl p-4 max-w-sm w-full relative"
            >
              {/* Close Button */}
              <button
                onClick={() => setShowStakingInfo(false)}
                className="absolute top-3 right-3 text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
              
              {/* Modal Content */}
              <div className="text-gray-200 pr-6">
                <div className="text-xs space-y-2">
                  <div className="font-semibold text-sm mb-3">🎯 How INTUIT Staking Works</div>
                  <div>• <strong>Single-sided staking:</strong> Only INTUIT needed</div>
                  <div>• <strong>Collective goal:</strong> 10,000+ INTUIT unlocks 12.5% APY</div>
                  <div>• <strong>Reward pool:</strong> 180,000 INTUIT distributed proportionally</div>
                  <div>• <strong>Immediate unstaking:</strong> Withdraw anytime</div>
                  <div>• <strong>No impermanent loss:</strong> Your amount never changes</div>
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
