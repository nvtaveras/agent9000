"use client";

import { VT323 } from "next/font/google";
import "./globals.css";
import { useEffect } from "react";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider } from "wagmi";
import { RainbowKitProvider } from "@rainbow-me/rainbowkit";
import "@rainbow-me/rainbowkit/styles.css";

import { config } from "@/wagmi";

const client = new QueryClient();

const vt323 = VT323({
   weight: "400",
   variable: "--font-vt323",
   subsets: ["latin"],
});

export default function RootLayout({
   children,
}: Readonly<{
   children: React.ReactNode;
}>) {
   useEffect(() => {
      document.title = "Agent 9000 - AI-powered Superchain DeFi";
   }, []);

   return (
      <html lang="en" className="dark">
         <body className={`${vt323.className} antialiased`}>
            <WagmiProvider config={config}>
               <QueryClientProvider client={client}>
                  <RainbowKitProvider>{children}</RainbowKitProvider>
               </QueryClientProvider>
            </WagmiProvider>
         </body>
      </html>
   );
}
