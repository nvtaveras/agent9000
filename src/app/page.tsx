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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ChevronDown, ArrowDown, Sparkles, Settings } from "lucide-react";
import { Header } from "@/components/header";
import { ChatInterface } from "@/components/chat-interface";
import { UniswapService } from "@/app/providers/uniswap/service";
import { ChainIcon } from "@/components/chain-icon";
import { SingleChainRoute, SwapRoutes } from "@/app/providers/uniswap/service";
import { Skeleton } from "@/components/ui/skeleton";

export default function CryptoSwap() {
  const [activeView, setActiveView] = useState<"boomer" | "zoomer">("boomer");
  const [sellAmount, setSellAmount] = useState("6000");
  const [buyAmount, setBuyAmount] = useState("2.25");
  const [sellCurrency, setSellCurrency] = useState("ST9000");
  const [buyCurrency, setBuyCurrency] = useState("ETH");
  const [activeTab, setActiveTab] = useState("Swap");
  const [showRouteModal, setShowRouteModal] = useState(false);
  const [routes, setRoutes] = useState<SwapRoutes | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);

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

  // Add this effect to fetch routes when modal opens
  useEffect(() => {
    if (showRouteModal) {
      uniswap.getSwapRoutes(sellCurrency, buyCurrency, sellAmount).then(setRoutes).catch(console.error);
    }
  }, [showRouteModal, sellCurrency, buyCurrency, sellAmount, uniswap]);

  return (
    <div className="flex flex-col min-h-screen matrix-bg">
      <Header activeView={activeView} setActiveView={setActiveView} />

      {activeView === "boomer" ? (
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
                    <div className="text-sm text-muted-foreground font-mono mb-2">Sell</div>
                    <div className="flex items-center">
                      <Input
                        type="text"
                        value={sellAmount}
                        onChange={handleSellAmountChange}
                        className="border-0 text-5xl md:text-4xl font-normal p-0 h-auto focus-visible:ring-0"
                      />
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
                              <div className="text-sm text-muted-foreground font-mono mb-2">
                                 Buy
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

                {/* You Receive Section */}
                <div className="flex justify-between items-center py-3 border-b border-border/50">
                  <div className="text-muted-foreground font-mono">You receive (0% fee)</div>
                  <div className="text-primary font-mono">
                    {buyAmount} {buyCurrency}
                  </div>
                </div>

                {/* Superchain Optimized */}
                <div
                  className="flex justify-between items-center py-2 cursor-pointer"
                  onClick={() => setShowRouteModal(true)}
                >
                  <div className="flex items-center gap-2 text-primary">
                    <div className="flex -space-x-1">
                      {routes?.optimizedRoute.steps.map((step) => (
                        <ChainIcon
                          key={step.chainId}
                          chainId={step.chainId}
                          className={`w-5 h-5 border ${
                            step === routes.optimizedRoute.steps[0] ? "border-primary/50 z-10" : "border-secondary/50"
                          }`}
                        />
                      )) ?? <></>}
                    </div>
                    <span className="font-mono">Superchain Optimized</span>
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <span>&lt; 0.01</span>
                    <ChevronDown className="h-4 w-4" />
                  </div>
                </div>

                        {/* Review Button */}
                        <Button
                           className="w-full text-lg py-6 tracking-wider"
                           disabled={isCalculating}
                        >
                           <div className="flex items-center justify-center gap-2">
                              {isCalculating ? (
                                 <>
                                    <div className="h-4 w-4 animate-spin rounded-[50%] border-2 border-white border-t-transparent" />
                                    Getting Quote
                                 </>
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
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span>Available routes</span>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {routes && (
              <>
                {/* Superchain Route */}
                <div className="flex flex-col gap-4 p-4 rounded-lg border border-primary/20 bg-primary/5 backdrop-blur-sm relative overflow-hidden">
                  {/* Add a subtle gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent pointer-events-none" />

                  <div className="flex items-center justify-between relative">
                    <div className="flex items-center gap-2">
                      <div className="flex -space-x-1">
                        {routes.optimizedRoute.steps.map((step) => (
                          <ChainIcon key={step.chainId} chainId={step.chainId} className="h-8 w-8 border-2" />
                        ))}
                      </div>
                      <span className="font-mono text-lg">Superchain Optimized</span>
                      <Sparkles className="h-5 w-5 text-primary" />
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    {routes.optimizedRoute.steps.map((step) => (
                      <div key={step.chainId} className="flex items-center gap-2 p-2">
                        <div className="w-16 text-right font-mono">{step.percentage}%</div>
                        <ChainIcon chainId={step.chainId} className="h-6 w-6" />
                      </div>
                    ))}
                  </div>

                  <div className="flex flex-col gap-1 mt-2 font-mono text-sm">
                    <div className="text-primary">Estimated Output: {routes.optimizedRoute.totalAmountOut} ETH</div>
                    <div className="text-primary/80">Fees: {routes.optimizedRoute.fee}</div>
                  </div>
                </div>

                {/* Single-Chain Routes */}
                {routes.singleChainRoutes.map((route: SingleChainRoute) => (
                  <div key={route.chainId} className="space-y-2 opacity-50 border border-muted/20 rounded-sm p-3">
                    <div className="flex items-center gap-2">
                      <ChainIcon chainId={route.chainId} />
                      <span>Single-Chain Swap</span>
                    </div>
                    <div className="text-sm text-muted-foreground">Route: {route.chainName}</div>
                    <div className="text-sm">
                      Estimated Output: {route.amountOut} {buyCurrency}
                    </div>
                    <div className="text-sm">Fees: {route.fee}</div>
                  </div>
                ))}
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
