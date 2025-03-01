"use client";

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
import {
   Dialog,
   DialogContent,
   DialogHeader,
   DialogTitle,
} from "@/components/ui/dialog";
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
   const [activeView, setActiveView] = useState<"home" | "boomer" | "zoomer">(
      "home"
   );
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

   const uniswap = useMemo(() => new UniswapService(), []);

   const updateBuyAmount = useCallback(async () => {
      setIsCalculating(true);
      try {
         const amountOut = await uniswap.getAmountOut(
            sellCurrency,
            buyCurrency,
            sellAmount
         );
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
         uniswap
            .getSwapRoutes(sellCurrency, buyCurrency, sellAmount)
            .then(setRoutes)
            .catch(console.error);
      } else {
         setRoutes(null);
      }
   }, [sellAmount, sellCurrency, buyCurrency, uniswap]);

   const handleSwap = async () => {
      if (!walletClient || !isConnected || !publicClient) {
         return;
      }

      setIsSwapping(true);
      try {
         const SUPERSWAPPER_ADDRESS =
            "0x42d68F02E890fd91da05E24935e549bBeeCb4Dad";
         const chainId = await walletClient.getChainId();

         // Get token addresses from the mapping in UniswapService
         const tokenInAddress =
            UniswapService.knownTokensPerChain[chainId][sellCurrency];

         // Get the routes from the service (keeping this for now)
         const routes = await uniswap.getSwapRoutes(
            sellCurrency,
            buyCurrency,
            sellAmount
         );
         const swaps = routes.optimizedRoute.steps;

         const chains = swaps.map((swap) => BigInt(swap.chainId));
         const amounts = swaps.map((swap) =>
            BigInt(
               parseUnits(
                  (
                     (Number(swap.percentage) / 100) *
                     Number(sellAmount)
                  ).toString(),
                  18
               )
            )
         );

         const amountsSum = amounts.reduce(
            (acc, amount) => acc + amount,
            BigInt(0)
         );

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
      }
   };

   const shouldShowOptimizedRoute = (routes: SwapRoutes | null) => {
      if (!routes) return false;

      const activeSteps = routes.optimizedRoute.steps.filter(
         (step) => step.percentage > 0
      );

      // If there's only one active step
      if (activeSteps.length === 1) {
         const step = activeSteps[0];
         // Check if this step exists in single chain routes with same amount
         const matchingSingleChainRoute = routes.singleChainRoutes.find(
            (route) =>
               route.chainId === step.chainId &&
               Math.abs(
                  parseFloat(route.amountOut) -
                     parseFloat(routes.optimizedRoute.totalAmountOut)
               ) < 0.000001
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
         const sellTokenAddress =
            UniswapService.knownTokensPerChain[chainId][sellCurrency];
         const buyTokenAddress =
            UniswapService.knownTokensPerChain[chainId][buyCurrency];

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
      if (
         isConnected &&
         parseFloat(sellAmount) > parseFloat(sellTokenBalance)
      ) {
         setInsufficientBalance(true);
      } else {
         setInsufficientBalance(false);
      }
   }, [isConnected, sellAmount, sellTokenBalance]);

   return (
      <div className="flex flex-col min-h-screen matrix-bg">
         <Header activeView={activeView} setActiveView={setActiveView} />

         {activeView === "home" ? (
            <main className="flex-1 flex flex-col items-center justify-center p-8 matrix-bg">
               <div className="w-full max-w-4xl text-center space-y-8">
                  <h1 className="text-[8rem] md:text-[12rem] font-mono text-primary leading-none tracking-tighter animate-pulse">
                     A9K
                  </h1>

                  <h2 className="text-4xl md:text-6xl font-mono text-white mb-6">
                     Your DeFi Companion
                  </h2>

                  <p className="text-xl md:text-2xl text-white/80 max-w-2xl mx-auto mb-8">
                     Optimize cross-chain swaps. Maximize yields. Stay ahead in
                     DeFi.
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
                     <div className="p-6 border border-primary/30 bg-background/60 backdrop-blur-sm">
                        <h3 className="text-2xl font-mono text-primary mb-3">
                           Cross-Chain Swaps
                        </h3>
                        <p className="text-white/70">
                           Intelligent routing across multiple chains for the
                           best possible rates
                        </p>
                     </div>

                     <div className="p-6 border border-primary/30 bg-background/60 backdrop-blur-sm">
                        <h3 className="text-2xl font-mono text-primary mb-3">
                           AI-Powered
                        </h3>
                        <p className="text-white/70">
                           Smart algorithms that optimize your trading
                           experience
                        </p>
                     </div>

                     <div className="p-6 border border-primary/30 bg-background/60 backdrop-blur-sm">
                        <h3 className="text-2xl font-mono text-primary mb-3">
                           Maximum Yields
                        </h3>
                        <p className="text-white/70">
                           Find the best yield opportunities across the entire
                           DeFi ecosystem
                        </p>
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
                     <Button
                        variant="ghost"
                        size="icon"
                        className="ml-2 text-primary hover:text-primary/80"
                     >
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
                                       Balance:{" "}
                                       {parseFloat(sellTokenBalance).toFixed(6)}{" "}
                                       {sellCurrency}
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
                                       <Button
                                          variant="outline"
                                          className="button-hacker ml-2"
                                       >
                                          <div className="w-6 h-6 rounded-none border border-primary/50 flex items-center justify-center mr-2">
                                             <span className="text-primary text-sm">
                                                $
                                             </span>
                                          </div>
                                          {sellCurrency}
                                          <ChevronDown className="h-4 w-4 ml-2" />
                                       </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent>
                                       <DropdownMenuItem
                                          onClick={() =>
                                             handleSellCurrencyChange("ST9000")
                                          }
                                       >
                                          Token9000 (ST9000)
                                       </DropdownMenuItem>
                                       <DropdownMenuItem
                                          onClick={() =>
                                             handleSellCurrencyChange("ETH")
                                          }
                                       >
                                          Super ETH
                                       </DropdownMenuItem>
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
                              <div className="text-sm text-muted-foreground font-mono mb-2">
                                 Buy
                              </div>
                              <div className="text-sm text-muted-foreground font-mono mb-2 flex justify-between">
                                 <span>Buy</span>
                                 {isConnected && (
                                    <span>
                                       Balance:{" "}
                                       {parseFloat(buyTokenBalance).toFixed(6)}{" "}
                                       {buyCurrency}
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
                                       onChange={(e) =>
                                          setBuyAmount(e.target.value)
                                       }
                                       className="border-0 text-5xl md:text-4xl font-normal p-0 h-auto focus-visible:ring-0"
                                    />
                                 )}
                                 <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                       <Button
                                          variant="outline"
                                          className="button-hacker ml-2"
                                       >
                                          <div className="w-6 h-6 rounded-none border border-primary/50 flex items-center justify-center mr-2">
                                             <svg
                                                xmlns="http://www.w3.org/2000/svg"
                                                className="h-3 w-3 text-primary"
                                                viewBox="0 0 24 24"
                                             >
                                                <path
                                                   d="M12 2L6 12L12 16L18 12L12 2Z"
                                                   fill="currentColor"
                                                />
                                                <path
                                                   d="M12 16V22L18 12L12 16Z"
                                                   fill="currentColor"
                                                   opacity="0.6"
                                                />
                                                <path
                                                   d="M12 16L6 12L12 22V16Z"
                                                   fill="currentColor"
                                                   opacity="0.6"
                                                />
                                             </svg>
                                          </div>
                                          {buyCurrency}
                                          <ChevronDown className="h-4 w-4 ml-2" />
                                       </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent>
                                       <DropdownMenuItem
                                          onClick={() =>
                                             handleBuyCurrencyChange("WETH")
                                          }
                                       >
                                          Super WETH
                                       </DropdownMenuItem>
                                       <DropdownMenuItem
                                          onClick={() =>
                                             handleBuyCurrencyChange("T9K")
                                          }
                                       >
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
                           className={`flex justify-between items-center py-2 ${
                              routes ? "cursor-pointer" : "opacity-50"
                           }`}
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
                                             step ===
                                             routes.optimizedRoute.steps[0]
                                                ? "border-primary/50 z-10"
                                                : "border-secondary/50"
                                          }`}
                                       />
                                    )) ?? <></>}
                              </div>
                              <span className="font-mono">
                                 {shouldShowOptimizedRoute(routes)
                                    ? "Superchain Optimized"
                                    : routes?.optimizedRoute.steps[0]
                                         ?.chainName}
                              </span>
                              {shouldShowOptimizedRoute(routes) && (
                                 <Sparkles className="h-4 w-4" />
                              )}
                           </div>
                        </div>

                        {/* Review Button */}
                        <Button
                           className="w-full text-lg py-6 tracking-wider"
                           disabled={
                              isCalculating ||
                              isSwapping ||
                              !isConnected ||
                              insufficientBalance
                           }
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
                  <DialogTitle className="text-sm">
                     Available Routes
                  </DialogTitle>
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
                                       .sort(
                                          (a, b) => b.percentage - a.percentage
                                       )
                                       .map((step) => (
                                          <ChainIcon
                                             key={step.chainId}
                                             chainId={step.chainId}
                                             className="h-7 w-7 border"
                                          />
                                       ))}
                                 </div>
                                 <span className="text-base font-mono">
                                    Superchain Optimized
                                 </span>
                                 <Sparkles className="h-5 w-5 text-primary" />
                              </div>
                           </div>

                           <div className="grid grid-cols-2 gap-2 text-base">
                              {routes.optimizedRoute.steps
                                 .filter((step) => step.percentage > 0)
                                 .sort((a, b) => b.percentage - a.percentage)
                                 .map((step) => (
                                    <div
                                       key={step.chainId}
                                       className="flex items-center gap-2"
                                    >
                                       <ChainIcon
                                          chainId={step.chainId}
                                          className="h-5 w-5"
                                       />
                                       <span className="font-mono">
                                          {step.percentage}%
                                       </span>
                                    </div>
                                 ))}
                           </div>

                           <div className="text-sm font-mono text-primary pt-1">
                              Output: {routes.optimizedRoute.totalAmountOut}{" "}
                              {buyCurrency}
                           </div>
                        </div>

                        {/* Single-Chain Routes */}
                        <div className="text-sm text-muted-foreground font-mono pt-2">
                           Single Chain Swaps:
                        </div>
                        {routes.singleChainRoutes.map(
                           (route: SingleChainRoute) => {
                              const isHighlighted =
                                 routes &&
                                 !shouldShowOptimizedRoute(routes) &&
                                 route.chainId ===
                                    routes.optimizedRoute.steps[0].chainId;

                              return (
                                 <div
                                    key={route.chainId}
                                    className={`flex items-center justify-between p-3 border rounded-sm text-sm ${
                                       isHighlighted
                                          ? "border-primary/20 bg-primary/5"
                                          : "opacity-50 border-muted/20"
                                    }`}
                                 >
                                    <div className="flex items-center gap-2">
                                       <ChainIcon
                                          chainId={route.chainId}
                                          className="h-5 w-5"
                                       />
                                       <span>{route.chainName}</span>
                                    </div>
                                    <span className="font-mono">
                                       {route.amountOut} {buyCurrency}
                                    </span>
                                 </div>
                              );
                           }
                        )}
                     </>
                  )}
               </div>
            </DialogContent>
         </Dialog>

         {txHash && (
            <div className="mt-4 p-4 border border-primary/20 rounded-sm">
               <p className="text-sm font-mono">Transaction Hash: {txHash}</p>
            </div>
         )}
      </div>
   );
}
