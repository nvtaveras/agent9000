"use client";

import { useState} from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
   DropdownMenu,
   DropdownMenuContent,
   DropdownMenuItem,
   DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, ArrowDown, Sparkles, Settings } from "lucide-react";
import { Header } from "@/components/header";
import { ChatInterface } from "@/components/chat-interface";

export default function CryptoSwap() {
   const [activeView, setActiveView] = useState<"boomer" | "zoomer">("boomer");
   const [sellAmount, setSellAmount] = useState("6000");
   const [buyAmount, setBuyAmount] = useState("2.25");
   const [sellCurrency, setSellCurrency] = useState("USDC");
   const [buyCurrency, setBuyCurrency] = useState("ETH");
   const [activeTab, setActiveTab] = useState("Swap");

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
                              <div className="text-lg text-muted-foreground font-mono mb-2">
                                 Sell
                              </div>
                              <div className="flex items-center">
                                 <Input
                                    type="text"
                                    value={sellAmount}
                                    onChange={(e) =>
                                       setSellAmount(e.target.value)
                                    }
                                    className="border-0 text-4xl p-0 h-auto focus-visible:ring-0"
                                 />
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
                                             setSellCurrency("USDC")
                                          }
                                       >
                                          USDC
                                       </DropdownMenuItem>
                                       <DropdownMenuItem
                                          onClick={() =>
                                             setSellCurrency("USDT")
                                          }
                                       >
                                          USDT
                                       </DropdownMenuItem>
                                       <DropdownMenuItem
                                          onClick={() => setSellCurrency("DAI")}
                                       >
                                          DAI
                                       </DropdownMenuItem>
                                    </DropdownMenuContent>
                                 </DropdownMenu>
                              </div>
                              <div className="text-muted-foreground mt-1">
                                 $
                                 {Number.parseFloat(
                                    sellAmount
                                 ).toLocaleString()}
                              </div>
                           </div>

                           <div className="flex items-center justify-center border-t border-b border-border/50 py-2">
                              <div className="bg-background border border-primary/50 p-2">
                                 <ArrowDown className="h-4 w-4 text-primary" />
                              </div>
                           </div>

                           <div className="p-4 pt-2">
                              <div className="text-lg text-muted-foreground font-mono mb-2">
                                 Buy
                              </div>
                              <div className="flex items-center">
                                 <Input
                                    type="text"
                                    value={buyAmount}
                                    onChange={(e) =>
                                       setBuyAmount(e.target.value)
                                    }
                                    className="border-0 text-4xl p-0 h-auto focus-visible:ring-0"
                                 />
                                 <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                       <Button
                                          variant="outline"
                                          className="button-hacker ml-2"
                                       >
                                          <div className="w-6 h-6 rounded-none border border-primary/50 flex items-center justify-center mr-2">
                                             <svg
                                                className="h-3 w-3 text-primary"
                                                viewBox="0 0 24 24"
                                                fill="none"
                                                xmlns="http://www.w3.org/2000/svg"
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
                                          onClick={() => setBuyCurrency("ETH")}
                                       >
                                          ETH
                                       </DropdownMenuItem>
                                       <DropdownMenuItem
                                          onClick={() => setBuyCurrency("BTC")}
                                       >
                                          BTC
                                       </DropdownMenuItem>
                                       <DropdownMenuItem
                                          onClick={() => setBuyCurrency("SOL")}
                                       >
                                          SOL
                                       </DropdownMenuItem>
                                    </DropdownMenuContent>
                                 </DropdownMenu>
                              </div>
                              <div className="text-muted-foreground mt-1">
                                 $5,999.99
                              </div>
                           </div>
                        </div>

                        {/* You Receive Section */}
                        <div className="flex justify-between items-center py-3 border-b border-border/50">
                           <div className="text-muted-foreground font-mono">
                              You receive (0% fee)
                           </div>
                           <div className="text-primary font-mono">
                              {buyAmount} {buyCurrency}
                           </div>
                        </div>

                        {/* Superchain Optimized */}
                        <div className="flex justify-between items-center py-2">
                           <div className="flex items-center gap-2 text-primary">
                              <div className="flex -space-x-1">
                                 <div className="w-5 h-5 border border-primary/50 flex items-center justify-center z-10">
                                    <span className="text-primary text-xs">
                                       S
                                    </span>
                                 </div>
                                 <div className="w-5 h-5 border border-secondary/50 flex items-center justify-center">
                                    <span className="text-secondary text-xs">
                                       C
                                    </span>
                                 </div>
                              </div>
                              <span className="font-mono">
                                 Superchain Optimized
                              </span>
                              <Sparkles className="h-4 w-4" />
                           </div>
                           <div className="flex items-center gap-1 text-muted-foreground">
                              <span>&lt; 0.01</span>
                              <ChevronDown className="h-4 w-4" />
                           </div>
                        </div>

                        {/* Review Button */}
                        <Button className="w-full text-lg py-6 uppercase tracking-wider">
                           Review Transaction
                        </Button>
                     </CardContent>
                  </Card>
               </div>
            </main>
         ) : (
            <ChatInterface />
         )}
      </div>
   );
}
