"use client";

import Link from "next/link";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { ChainIcon } from "./chain-icon";
import Image from "next/image";

export function Header({
   activeView,
   setActiveView,
}: {
   activeView: "boomer" | "zoomer";
   setActiveView: (view: "boomer" | "zoomer") => void;
}) {
   return (
      <header className="border-border/50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50 w-full">
         <div className="container flex h-16 items-center justify-between px-4">
            <div className="flex items-center gap-6">
               <Link href="/" className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded border border-primary/50 bg-background flex items-center justify-center overflow-hidden">
                     <Image
                        src="/logo-square.jpg"
                        alt="Agent 9000 Logo"
                        width={32}
                        height={32}
                        className="object-cover"
                     />
                  </div>
                  <span className="text-xl font-mono text-primary">
                     Agent 9000
                  </span>
               </Link>

               <nav className="hidden md:flex items-center gap-6">
                  <button
                     onClick={() => setActiveView("boomer")}
                     className={`text-lg font-mono cursor-pointer transition-colors duration-200 ease-in-out ${
                        activeView === "boomer"
                           ? "text-[#00ff92]"
                           : "text-foreground/90 hover:text-[#00ff92]/90"
                     }`}
                  >
                     Boomer
                  </button>
                  <button
                     onClick={() => setActiveView("zoomer")}
                     className={`text-lg font-mono cursor-pointer transition-colors duration-200 ease-in-out ${
                        activeView === "zoomer"
                           ? "text-[#00ff92]"
                           : "text-foreground/90 hover:text-[#00ff92]/90"
                     }`}
                  >
                     Zoomer
                  </button>
               </nav>
            </div>

            <div className="hidden md:flex items-center gap-4">
               <ConnectButton.Custom>
                  {({
                     account,
                     chain,
                     openAccountModal,
                     openChainModal,
                     openConnectModal,
                     mounted,
                  }) => {
                     const ready = mounted;
                     if (!ready) {
                        return null;
                     }

                     return (
                        <div className="flex items-center gap-2">
                           {(() => {
                              if (!mounted || !account || !chain) {
                                 return (
                                    <button
                                       onClick={openConnectModal}
                                       className="cursor: pointer; bg-[#00ff9240] border border-[#00ff92] text-[#00ff92] 
                                                 hover:bg-[#00ff9220] transition-all duration-200 
                                                 font-mono text-sm px-3 py-1.5 rounded-xl cursor-pointer
                                                 hover:shadow-[0_0_5px_rgba(0,255,146,0.3)]"
                                    >
                                       Connect Wallet
                                    </button>
                                 );
                              }

                              return (
                                 <div className="flex items-center gap-2">
                                    <button
                                       onClick={openChainModal}
                                       className="bg-[#00ff9240] border border-[#00ff92] text-[#00ff92] 
                                                hover:bg-[#00ff9220] transition-all duration-200 
                                                font-mono text-sm px-3 py-1.5 rounded-xl cursor-pointer
                                                hover:shadow-[0_0_5px_rgba(0,255,146,0.3)]
                                                flex items-center gap-2"
                                    >
                                       <ChainIcon
                                          chainId={chain.id}
                                          className="h-4 w-4"
                                       />
                                       {chain.name}
                                    </button>
                                    <button
                                       onClick={openAccountModal}
                                       className="bg-[#00ff9240] border border-[#00ff92] text-[#00ff92] 
                                                hover:bg-[#00ff9220] transition-all duration-200 
                                                font-mono text-sm px-3 py-1.5 rounded-xl cursor-pointer
                                                hover:shadow-[0_0_5px_rgba(0,255,146,0.3)]
                                                flex items-center gap-2"
                                    >
                                       <div className="h-4 w-4 flex items-center justify-center border border-[#00ff92] rounded-md text-xs">
                                          $
                                       </div>
                                       {account.displayName}
                                    </button>
                                 </div>
                              );
                           })()}
                        </div>
                     );
                  }}
               </ConnectButton.Custom>
            </div>
         </div>
      </header>
   );
}
