"use client";

import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider } from "wagmi";
import { RainbowKitProvider } from "@rainbow-me/rainbowkit";
import "@rainbow-me/rainbowkit/styles.css";

import { config } from "../../wagmi";

const client = new QueryClient();

const geistSans = Geist({
   variable: "--font-geist-sans",
   subsets: ["latin"],
});

const geistMono = Geist_Mono({
   variable: "--font-geist-mono",
   subsets: ["latin"],
});

export default function RootLayout({
   children,
}: Readonly<{
   children: React.ReactNode;
}>) {
   return (
      <html lang="en" className="dark">
         <body
            className={`${geistSans.variable} ${geistMono.variable} antialiased`}
         >
            <WagmiProvider config={config}>
               <QueryClientProvider client={client}>
                  <RainbowKitProvider>{children}</RainbowKitProvider>
               </QueryClientProvider>
            </WagmiProvider>
         </body>
      </html>
   );
}
