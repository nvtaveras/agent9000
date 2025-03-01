"use client";

import React, { Fragment } from "react";
import { useState, useMemo, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ChevronDown, ArrowDown, Sparkles, Settings } from "lucide-react";
import { Header } from "@/components/header";
import { ChatInterface } from "@/components/chat-interface";
import { UniswapService } from "@/app/providers/uniswap/service";
import { ChainIcon } from "@/components/chain-icon";
import { SingleChainRoute, SwapRoutes } from "@/app/providers/uniswap/service";
import { Skeleton } from "@/components/ui/skeleton";
import { useAccount, useWalletClient, usePublicClient } from "wagmi";
import { abi as erc20abi } from "@/app/providers/ABIs/erc20";
import { abi as superswapperAbi } from "@/app/providers/ABIs/superswapper";
import { parseUnits, formatUnits } from "viem";

export default function CryptoSwap() {
  const [activeView, setActiveView] = useState<"home" | "boomer" | "zoomer">("home");
  const [sellAmount, setSellAmount] = useState("0");
  const [buyAmount, setBuyAmount] = useState("0");
  const [sellCurrency, setSellCurrency] = useState("ST9000");
  const [buyCurrency, setBuyCurrency] = useState("ETH");
  const [activeTab, setActiveTab] = useState("Swap");
  const [showRouteModal, setShowRouteModal] = useState(false);
  const [routes, setRoutes] = useState<SwapRoutes | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [isSwapping, setIsSwapping] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const { isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();
  const [sellTokenBalance, setSellTokenBalance] = useState<string>("0");
  const [buyTokenBalance, setBuyTokenBalance] = useState<string>("0");
  const [insufficientBalance, setInsufficientBalance] = useState(false);
  const [isRefreshingBalances, setIsRefreshingBalances] = useState(false);
  const [showTxModal, setShowTxModal] = useState(false);
  const [txTimer, setTxTimer] = useState(0);
  const [txInterval, setTxInterval] = useState<NodeJS.Timeout | null>(null);

  const uniswap = useMemo(() => new UniswapService(), []);

  const updateBuyAmount = useCallback(async () => {
    setIsCalculating(true);
    try {
      const amountOut = await uniswap.getAmountOut(sellCurrency, buyCurrency, sellAmount);
      setBuyAmount(amountOut);
    } catch (error) {
      console.error("Error calculating amount out:", error);
    } finally {
      setIsCalculating(false);
    }
  }, [sellCurrency, buyCurrency, sellAmount, uniswap]);

  // Update buy amount when inputs change
  useEffect(() => {
    updateBuyAmount();
  }, [sellAmount, sellCurrency, buyCurrency, updateBuyAmount]);

  // Helper function to get the opposite token
  const getOppositeToken = (current: string) => {
    return current === "ST9000" ? "ETH" : "ST9000";
  };

  // Update buy currency whenever sell currency changes
  const handleSellCurrencyChange = (newCurrency: string) => {
    setSellCurrency(newCurrency);
    setBuyCurrency(getOppositeToken(newCurrency));
  };

  // Update sell currency whenever buy currency changes
  const handleBuyCurrencyChange = (newCurrency: string) => {
    setBuyCurrency(newCurrency);
    setSellCurrency(getOppositeToken(newCurrency));
  };

  // Update the input handler
  const handleSellAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSellAmount(e.target.value);
  };

  // Update this effect to fetch routes when inputs change
  useEffect(() => {
    if (sellAmount && parseFloat(sellAmount) > 0) {
      uniswap.getSwapRoutes(sellCurrency, buyCurrency, sellAmount).then(setRoutes).catch(console.error);
    } else {
      setRoutes(null);
    }
  }, [sellAmount, sellCurrency, buyCurrency, uniswap]);

  const handleSwap = async () => {
    if (!walletClient || !isConnected || !publicClient) {
      return;
    }

    setIsSwapping(true);
    setShowTxModal(true);

    try {
      const SUPERSWAPPER_ADDRESS = "0x42d68F02E890fd91da05E24935e549bBeeCb4Dad";
      const chainId = await walletClient.getChainId();

      // Get token addresses from the mapping in UniswapService
      const tokenInAddress = UniswapService.knownTokensPerChain[chainId][sellCurrency];

      // Get the routes from the service
      const routes = await uniswap.getSwapRoutes(sellCurrency, buyCurrency, sellAmount);
      const swaps = routes.optimizedRoute.steps;

      const chains = swaps.map((swap) => BigInt(swap.chainId));
      const amounts = swaps.map((swap) =>
        BigInt(parseUnits(((Number(swap.percentage) / 100) * Number(sellAmount)).toString(), 18)),
      );

      const amountsSum = amounts.reduce((acc, amount) => acc + amount, BigInt(0));

      // First approve the token spend
      const approveHash = await walletClient.writeContract({
        address: tokenInAddress as `0x${string}`,
        abi: erc20abi,
        functionName: "approve",
        args: [SUPERSWAPPER_ADDRESS as `0x${string}`, amountsSum],
      });

      console.log(`Approve tx: ${approveHash}`);

      // Then do the swap
      const swapHash = await walletClient.writeContract({
        address: SUPERSWAPPER_ADDRESS as `0x${string}`,
        abi: superswapperAbi,
        functionName: "initiateSwap",
        args: [tokenInAddress as `0x${string}`, amounts, chains],
      });

      console.log(`Swap tx: ${swapHash}`);
      setTxHash(swapHash);

      // Start the timer only after the transaction is sent
      const interval = setInterval(() => {
        setTxTimer((prev) => prev + 1);
      }, 1000);
      setTxInterval(interval);

      // Wait for the transaction to be confirmed
      if (publicClient) {
        await publicClient.waitForTransactionReceipt({
          hash: swapHash as `0x${string}`,
        });
      }

      // Fetch updated balances after transaction confirmation
      fetchTokenBalances();
    } catch (error) {
      console.error("Swap failed:", error);
    } finally {
      setIsSwapping(false);
      setShowTxModal(false);

      // Clear the timer
      if (txInterval) {
        clearInterval(txInterval);
        setTxInterval(null);
      }
      setTxTimer(0);
    }
  };

  const shouldShowOptimizedRoute = (routes: SwapRoutes | null) => {
    if (!routes) return false;

    const activeSteps = routes.optimizedRoute.steps.filter((step) => step.percentage > 0);

    // If there's only one active step
    if (activeSteps.length === 1) {
      const step = activeSteps[0];
      // Check if this step exists in single chain routes with same amount
      const matchingSingleChainRoute = routes.singleChainRoutes.find(
        (route) =>
          route.chainId === step.chainId &&
          Math.abs(parseFloat(route.amountOut) - parseFloat(routes.optimizedRoute.totalAmountOut)) < 0.000001,
      );
      return !matchingSingleChainRoute;
    }

    return true;
  };

  const fetchTokenBalances = useCallback(async () => {
    if (!publicClient || !isConnected) return;

    setIsRefreshingBalances(true);
    try {
      const chainId = await publicClient.getChainId();
      const account = (await walletClient?.getAddresses())?.[0];
      if (!account) return;

      // Get token addresses
      const sellTokenAddress = UniswapService.knownTokensPerChain[chainId][sellCurrency];
      const buyTokenAddress = UniswapService.knownTokensPerChain[chainId][buyCurrency];

      // Fetch sell token balance
      const sellBalance = await publicClient.readContract({
        address: sellTokenAddress as `0x${string}`,
        abi: erc20abi,
        functionName: "balanceOf",
        args: [account],
      });

      // Fetch buy token balance using publicClient
      const buyBalance = await publicClient.readContract({
        address: buyTokenAddress as `0x${string}`,
        abi: erc20abi,
        functionName: "balanceOf",
        args: [account],
      });

      // Format balances (assuming 18 decimals)
      setSellTokenBalance(formatUnits(sellBalance as bigint, 18));
      setBuyTokenBalance(formatUnits(buyBalance as bigint, 18));
    } catch (error) {
      console.error("Error fetching token balances:", error);
    } finally {
      setIsRefreshingBalances(false);
    }
  }, [publicClient, walletClient, isConnected, sellCurrency, buyCurrency]);

  // Add this useEffect to fetch balances when needed
  useEffect(() => {
    if (isConnected) {
      fetchTokenBalances();
    }
  }, [isConnected, sellCurrency, buyCurrency, fetchTokenBalances]);

  // Add a function to set maximum available amount
  const handleSetMaxAmount = () => {
    setSellAmount(sellTokenBalance);
  };

  // Add validation for insufficient balance
  useEffect(() => {
    if (isConnected && parseFloat(sellAmount) > parseFloat(sellTokenBalance)) {
      setInsufficientBalance(true);
    } else {
      setInsufficientBalance(false);
    }
  }, [isConnected, sellAmount, sellTokenBalance]);

  // Clean up timer when component unmounts
  useEffect(() => {
    return () => {
      if (txInterval) {
        clearInterval(txInterval);
      }
    };
  }, [txInterval]);

  return (
    <div className="flex flex-col min-h-screen matrix-bg">
      <Header activeView={activeView} setActiveView={setActiveView} />

      {activeView === "home" ? (
        <main className="flex-1 flex flex-col items-center justify-center p-8 matrix-bg">
          <div className="w-full max-w-4xl text-center space-y-8">
            <h1 className="text-[8rem] md:text-[12rem] font-mono text-primary leading-none tracking-tighter animate-pulse">
              A9K
            </h1>

            <h2 className="text-4xl md:text-5xl font-mono text-white mb-6">Superpowered AI agent for the superchain</h2>

            <p className="text-xl md:text-2xl text-white/80 max-w-2xl mx-auto mb-8">
              Optimize cross-chain swaps. Maximize yields. Stay ahead in DeFi.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
              <div className="p-6 border border-primary/30 bg-background/60 backdrop-blur-sm">
                <h3 className="text-2xl font-mono text-primary mb-3">Cross-Chain Swaps</h3>
                <p className="text-white/70">Intelligent routing across multiple chains for the best possible rates</p>
              </div>

              <div className="p-6 border border-primary/30 bg-background/60 backdrop-blur-sm">
                <h3 className="text-2xl font-mono text-primary mb-3">AI-Powered</h3>
                <p className="text-white/70">Smart algorithms that optimize your trading experience</p>
              </div>

              <div className="p-6 border border-primary/30 bg-background/60 backdrop-blur-sm">
                <h3 className="text-2xl font-mono text-primary mb-3">Maximum Yields</h3>
                <p className="text-white/70">Find the best yield opportunities across the entire DeFi ecosystem</p>
              </div>
            </div>

            <div className="mt-12">
              <button
                onClick={() => setActiveView("boomer")}
                className="px-8 py-4 text-xl font-mono bg-primary text-background hover:bg-primary/90 transition-colors"
              >
                Launch App
              </button>
            </div>
          </div>
        </main>
      ) : activeView === "boomer" ? (
        <main className="flex-1 flex items-center justify-center p-4">
          <div className="w-full max-w-md">
            {/* Tabs */}
            <div className="flex justify-center mb-4">
              <div className="bg-accent/50 p-1 rounded-none flex">
                {["Swap", "Earn"].map((tab) => (
                  <button
                    key={tab}
                    className={`px-6 py-2 text-sm font-mono uppercase tracking-wider ${
                      activeTab === tab
                        ? "bg-background border border-primary/50 text-primary"
                        : "text-muted-foreground hover:text-primary/80"
                    }`}
                    onClick={() => setActiveTab(tab)}
                  >
                    {`> ${tab}`}
                  </button>
                ))}
              </div>
              <Button variant="ghost" size="icon" className="ml-2 text-primary hover:text-primary/80">
                <Settings className="h-5 w-5" />
              </Button>
            </div>

            <Card>
              <CardContent className="space-y-4 pt-6">
                {/* Sell Section */}
                <div className="rounded-none border border-border/50">
                  <div className="p-4 pb-2">
                    <div className="text-sm text-muted-foreground font-mono mb-2 flex justify-between">
                      <span>Sell</span>
                      {isConnected && (
                        <span>
                          Balance: {parseFloat(sellTokenBalance).toFixed(6)} {sellCurrency}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center">
                      <Input
                        type="text"
                        value={sellAmount}
                        onChange={handleSellAmountChange}
                        className="border-0 text-5xl md:text-4xl font-normal p-0 h-auto focus-visible:ring-0"
                      />
                      {isConnected && (
                        <button
                          onClick={handleSetMaxAmount}
                          className="text-xs text-primary border border-primary/30 px-2 py-0.5 rounded ml-2 hover:bg-primary/10"
                        >
                          Max
                        </button>
                      )}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" className="button-hacker ml-2">
                            <div className="w-6 h-6 rounded-none border border-primary/50 flex items-center justify-center mr-2">
                              <span className="text-primary text-sm">$</span>
                            </div>
                            {sellCurrency}
                            <ChevronDown className="h-4 w-4 ml-2" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuItem onClick={() => handleSellCurrencyChange("ST9000")}>
                            Token9000 (ST9000)
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleSellCurrencyChange("ETH")}>Super ETH</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    {/* TODO: Add the price of the token */}
                    {/* <div className="text-sm text-muted-foreground mt-1">
                                 $
                                 {Number.parseFloat(
                                    sellAmount
                                 ).toLocaleString()}
                              </div> */}
                  </div>

                  <div className="flex items-center justify-center border-t border-b border-border/50 py-2">
                    <div className="bg-background border border-primary/50 p-2">
                      <ArrowDown className="h-4 w-4 text-primary" />
                    </div>
                  </div>

                  <div className="p-4 pt-2">
                    <div className="text-sm text-muted-foreground font-mono mb-2">Buy</div>
                    <div className="text-sm text-muted-foreground font-mono mb-2 flex justify-between">
                      <span>Buy</span>
                      {isConnected && (
                        <span>
                          Balance: {parseFloat(buyTokenBalance).toFixed(6)} {buyCurrency}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center">
                      {isCalculating ? (
                        <Skeleton className="h-8 flex-1" />
                      ) : (
                        <Input
                          type="text"
                          value={buyAmount}
                          onChange={(e) => setBuyAmount(e.target.value)}
                          className="border-0 text-5xl md:text-4xl font-normal p-0 h-auto focus-visible:ring-0"
                        />
                      )}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" className="button-hacker ml-2">
                            <div className="w-6 h-6 rounded-none border border-primary/50 flex items-center justify-center mr-2">
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-3 w-3 text-primary"
                                viewBox="0 0 24 24"
                              >
                                <path d="M12 2L6 12L12 16L18 12L12 2Z" fill="currentColor" />
                                <path d="M12 16V22L18 12L12 16Z" fill="currentColor" opacity="0.6" />
                                <path d="M12 16L6 12L12 22V16Z" fill="currentColor" opacity="0.6" />
                              </svg>
                            </div>
                            {buyCurrency}
                            <ChevronDown className="h-4 w-4 ml-2" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuItem onClick={() => handleBuyCurrencyChange("WETH")}>
                            Super WETH
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleBuyCurrencyChange("T9K")}>
                            Token9000 (T9K)
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    {/* TODO: Add the price of the token */}
                    {/* <div className="text-sm text-muted-foreground mt-1">
                                 $5,999.99
                              </div> */}
                  </div>
                </div>

                {/* Route Selection Button */}
                <div
                  className={`flex justify-between items-center py-2 ${routes ? "cursor-pointer" : "opacity-50"}`}
                  onClick={() => routes && setShowRouteModal(true)}
                >
                  <div className="flex items-center gap-2 text-primary">
                    <div className="flex -space-x-1">
                      {routes?.optimizedRoute.steps
                        .filter((step) => step.percentage > 0)
                        .map((step) => (
                          <ChainIcon
                            key={step.chainId}
                            chainId={step.chainId}
                            className={`w-5 h-5 border ${
                              step === routes.optimizedRoute.steps[0] ? "border-primary/50 z-10" : "border-secondary/50"
                            }`}
                          />
                        )) ?? <></>}
                    </div>
                    <span className="font-mono">
                      {shouldShowOptimizedRoute(routes)
                        ? "Superchain Optimized"
                        : routes?.optimizedRoute.steps[0]?.chainName}
                    </span>
                    {shouldShowOptimizedRoute(routes) && <Sparkles className="h-4 w-4" />}
                  </div>
                </div>

                {/* Review Button */}
                <Button
                  className="w-full text-lg py-6 tracking-wider"
                  disabled={isCalculating || isSwapping || !isConnected || insufficientBalance}
                  onClick={handleSwap}
                >
                  <div className="flex items-center justify-center gap-2">
                    {isSwapping ? (
                      <>
                        <div className="h-4 w-4 animate-spin rounded-[50%] border-2 border-white border-t-transparent" />
                        Swapping...
                      </>
                    ) : isCalculating ? (
                      <>
                        <div className="h-4 w-4 animate-spin rounded-[50%] border-2 border-white border-t-transparent" />
                        Getting Quote
                      </>
                    ) : !isConnected ? (
                      "Connect Wallet"
                    ) : insufficientBalance ? (
                      "Insufficient Balance"
                    ) : (
                      "Review Transaction"
                    )}
                  </div>
                </Button>
              </CardContent>
            </Card>
          </div>
        </main>
      ) : (
        <ChatInterface />
      )}

      {/* Add the Routes Modal */}
      <Dialog open={showRouteModal} onOpenChange={setShowRouteModal}>
        <DialogContent className="sm:max-w-[400px] p-4">
          <DialogHeader className="pb-2">
            <DialogTitle className="text-sm">Available Routes</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            {routes && (
              <>
                {/* Superchain Route */}
                <div className="flex flex-col gap-3 p-4 rounded-lg border border-primary/20 bg-primary/5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="flex -space-x-1">
                        {routes.optimizedRoute.steps
                          .filter((step) => step.percentage > 0)
                          .sort((a, b) => b.percentage - a.percentage)
                          .map((step) => (
                            <ChainIcon key={step.chainId} chainId={step.chainId} className="h-7 w-7 border" />
                          ))}
                      </div>
                      <span className="text-base font-mono">Superchain Optimized</span>
                      <Sparkles className="h-5 w-5 text-primary" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-base">
                    {routes.optimizedRoute.steps
                      .filter((step) => step.percentage > 0)
                      .sort((a, b) => b.percentage - a.percentage)
                      .map((step) => (
                        <div key={step.chainId} className="flex items-center gap-2">
                          <ChainIcon chainId={step.chainId} className="h-5 w-5" />
                          <span className="font-mono">{step.percentage}%</span>
                        </div>
                      ))}
                  </div>

                  <div className="text-sm font-mono text-primary pt-1">
                    Output: {routes.optimizedRoute.totalAmountOut} {buyCurrency}
                  </div>
                </div>

                {/* Single-Chain Routes */}
                <div className="text-sm text-muted-foreground font-mono pt-2">Single Chain Swaps:</div>
                {routes.singleChainRoutes.map((route: SingleChainRoute) => {
                  const isHighlighted =
                    routes &&
                    !shouldShowOptimizedRoute(routes) &&
                    route.chainId === routes.optimizedRoute.steps[0].chainId;

                  return (
                    <div
                      key={route.chainId}
                      className={`flex items-center justify-between p-3 border rounded-sm text-sm ${
                        isHighlighted ? "border-primary/20 bg-primary/5" : "opacity-50 border-muted/20"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <ChainIcon chainId={route.chainId} className="h-5 w-5" />
                        <span>{route.chainName}</span>
                      </div>
                      <span className="font-mono">
                        {route.amountOut} {buyCurrency}
                      </span>
                    </div>
                  );
                })}
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Transaction Progress Modal */}
      <Dialog
        open={showTxModal}
        onOpenChange={(open) => {
          if (!open && txInterval) {
            clearInterval(txInterval);
            setTxInterval(null);
            setTxTimer(0);
          }
          setShowTxModal(open);
        }}
      >
        <DialogContent className="sm:max-w-[400px] p-4">
          <DialogHeader className="pb-2">
            <DialogTitle className="text-lg font-mono">Superchain Transfer in Progress</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Spinner and Timer */}
            <div className="flex flex-col items-center justify-center py-3">
              <div className="h-12 w-12 animate-spin rounded-[50%] border-4 border-primary border-t-transparent mb-2" />
              <div className="text-lg font-mono">
                {Math.floor(txTimer / 60)
                  .toString()
                  .padStart(2, "0")}
                :{(txTimer % 60).toString().padStart(2, "0")}
              </div>
            </div>

            {/* Route Animation - Improved Layout */}
            {routes && (
              <div
                className="route-animation-container rounded-lg border border-primary/20 bg-primary/5 p-4 my-2"
                style={{ height: "240px" }}
              >
                <h3 className="text-primary font-mono mb-3 text-sm">Cross-Chain Routes</h3>

                {/* Single animation row with one wallet on each side */}
                <div className="relative h-full flex items-center">
                  {/* Wallet Icon (Source) */}
                  <div className="absolute left-2 top-1/2 -translate-y-1/2 z-20">
                    <div className="w-10 h-10 rounded-full border-2 border-primary/50 flex items-center justify-center bg-background">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="h-5 w-5 text-primary"
                      >
                        <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
                        <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
                        <path d="M18 12a2 2 0 0 0 0 4h4v-4Z" />
                      </svg>
                    </div>
                  </div>

                  {/* Center Chain Icons */}
                  <div className="absolute left-1/2 transform -translate-x-1/2 flex flex-col items-center z-20 space-y-10">
                    {routes.optimizedRoute.steps
                      .filter((step) => step.percentage > 0)
                      .sort((a, b) => b.percentage - a.percentage)
                      .map((step, index) => (
                        <div key={step.chainId} className="relative">
                          {/* Percentage Label - Centered above */}
                          <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 bg-primary/20 border border-primary/50 rounded-full px-1.5 py-0.5 text-xs font-mono">
                            {step.percentage}%
                          </div>

                          {/* Chain Icon */}
                          <ChainIcon
                            chainId={step.chainId}
                            className="h-8 w-8 border-2 border-primary/50 rounded-full p-0.5 bg-background overflow-hidden"
                          />
                        </div>
                      ))}
                  </div>

                  {/* Wallet Icon (Destination) */}
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 z-20">
                    <div className="w-10 h-10 rounded-full border-2 border-primary/50 flex items-center justify-center bg-background">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="h-5 w-5 text-primary"
                      >
                        <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
                        <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
                        <path d="M18 12a2 2 0 0 0 0 4h4v-4Z" />
                      </svg>
                    </div>
                  </div>

                  {/* Path Lines with curved SVG paths */}
                  <svg
                    className="absolute w-full h-full top-0 left-0 z-10"
                    viewBox="0 0 400 240"
                    preserveAspectRatio="none"
                  >
                    {routes.optimizedRoute.steps
                      .filter((step) => step.percentage > 0)
                      .sort((a, b) => b.percentage - a.percentage)
                      .map((step, index, array) => {
                        const totalSteps = array.length;
                        const centerY = 120; // Middle of container
                        const spacing = 50; // Increased spacing between paths
                        const offset = (index - (totalSteps - 1) / 2) * spacing;
                        const pathY = centerY + offset;

                        // For 3 chains, index 1 is the middle one
                        const isMiddleToken = totalSteps === 3 ? index === 1 : Math.abs(offset) < 10;

                        return (
                          <Fragment key={`path-${step.chainId}`}>
                            {/* Path */}
                            <path
                              d={
                                isMiddleToken
                                  ? `M 15,120 L 385,120` // Straight line for middle token
                                  : `M 15,120 Q 100,${pathY} 200,${pathY} Q 300,${pathY} 385,120`
                              } // Curved for others
                              stroke="rgba(0, 255, 146, 0.3)"
                              strokeWidth="2"
                              fill="none"
                              strokeDasharray="5,5"
                            />
                          </Fragment>
                        );
                      })}
                  </svg>

                  {/* Moving Tokens */}
                  {routes.optimizedRoute.steps
                    .filter((step) => step.percentage > 0)
                    .sort((a, b) => b.percentage - a.percentage)
                    .map((step, index) => (
                      <div key={`token-${step.chainId}`} className={`moving-token-${index} absolute z-30`}>
                        <div className="h-4 w-4 rounded-full bg-primary/80 shadow-[0_0_8px_rgba(0,255,146,0.5)]"></div>
                      </div>
                    ))}
                </div>

                {/* Information below animations */}
                <div className="text-xs text-muted-foreground mt-2 pt-2 border-t border-primary/10">
                  <span className="font-mono">
                    Expected output: {routes.optimizedRoute.totalAmountOut} {buyCurrency}
                  </span>
                </div>
              </div>
            )}

            {/* Information Text */}
            <div className="text-xs text-muted-foreground">
              <p className="mb-2">Your transaction is being processed across multiple chains simultaneously.</p>
              <p className="flex items-center gap-1">
                <span>Superchain transactions confirm in seconds vs minutes on traditional bridges.</span>
              </p>
            </div>

            {/* Transaction Hash (if available) */}
            {txHash && (
              <div className="pt-2 border-t border-primary/10">
                <p className="text-xs font-mono break-all text-muted-foreground">Transaction: {txHash}</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Updated animation styles */}
      <style jsx global>{`
        .route-animation-container {
          position: relative;
          overflow: hidden;
        }

        ${routes?.optimizedRoute.steps
          .filter((step) => step.percentage > 0)
          .sort((a, b) => b.percentage - a.percentage)
          .map((step, index, array) => {
            const totalSteps = array.length;
            const centerY = 120;
            const spacing = 50;
            const offset = (index - (totalSteps - 1) / 2) * spacing;
            const pathY = centerY + offset;

            // Check if this is the middle token (or closest to middle)
            const isMiddleToken = totalSteps === 3 ? index === 1 : Math.abs(offset) < spacing / 2;

            return `
                     .moving-token-${index} {
                        animation: moveAcrossChains-${index} 4s infinite;
                        animation-delay: ${index * 0.8}s;
                        position: absolute;
                        transform: translate(-50%, -50%);
                     }
                     
                     @keyframes moveAcrossChains-${index} {
                        0%, 5% {
                           left: 15px;
                           top: 120px;
                           transform: translate(-50%, -50%) scale(0.8);
                           opacity: 0;
                        }
                        10% {
                           opacity: 1;
                           transform: translate(-50%, -50%) scale(1);
                        }
                        ${
                          isMiddleToken
                            ? `
                        /* Straight line path animation for middle token */
                        25% {
                           left: 100px;
                           top: 120px;
                           transform: translate(-50%, -50%) scale(1);
                        }
                        /* Pass through the chain icon */
                        50% {
                           left: 200px;
                           top: 120px;
                           transform: translate(-50%, -50%) scale(1.2);
                        }
                        75% {
                           left: 300px;
                           top: 120px;
                           transform: translate(-50%, -50%) scale(1);
                        }
                        `
                            : `
                        /* Curved path animation for outer tokens */
                        15% {
                           left: 50px;
                           top: ${120 + (pathY - 120) * 0.2}px;
                           transform: translate(-50%, -50%) scale(1);
                        }
                        30% {
                           left: 100px;
                           top: ${pathY}px;
                           transform: translate(-50%, -50%) scale(1);
                        }
                        /* Pass through the chain icon */
                        50% {
                           left: 200px;
                           top: ${pathY}px;
                           transform: translate(-50%, -50%) scale(1.2);
                        }
                        70% {
                           left: 300px;
                           top: ${pathY}px;
                           transform: translate(-50%, -50%) scale(1);
                        }
                        85% {
                           left: 350px;
                           top: ${120 + (pathY - 120) * 0.2}px;
                           transform: translate(-50%, -50%) scale(1);
                        }
                        `
                        }
                        90% {
                           opacity: 1;
                        }
                        95%, 100% {
                           left: 385px;
                           top: 120px;
                           transform: translate(-50%, -50%) scale(0.8);
                           opacity: 0;
                        }
                     }
                  `;
          })
          .join("\n") || ""}
      `}</style>
    </div>
  );
}
