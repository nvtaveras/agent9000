"use client";

import Link from "next/link";
import { ConnectButton } from "@rainbow-me/rainbowkit";

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
                     <span className="font-mono text-primary text-xs terminal-text">
                        A9K
                     </span>
                  </div>
                  <span className="text-xl font-mono text-primary">
                     Agent 9000
                  </span>
               </Link>

               <nav className="hidden md:flex items-center gap-6">
                  <button
                     onClick={() => setActiveView("boomer")}
                     className={`text-base font-mono ${
                        activeView === "boomer"
                           ? "text-secondary"
                           : "text-foreground/70 hover:text-secondary/90"
                     }`}
                  >
                     boomer
                  </button>
                  <button
                     onClick={() => setActiveView("zoomer")}
                     className={`text-base font-mono ${
                        activeView === "zoomer"
                           ? "text-secondary"
                           : "text-foreground/70 hover:text-secondary/90"
                     }`}
                  >
                     zoomer
                  </button>
               </nav>
            </div>

            <div className="hidden md:flex items-center gap-4">
               <ConnectButton />
            </div>
         </div>
      </header>
   );
}
