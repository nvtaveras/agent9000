"use client";

import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import {
   arbitrum,
   base,
   mainnet,
   optimism,
   polygon,
   sepolia,
} from "wagmi/chains";

export const config = getDefaultConfig({
   appName: "Agent 9000",
   projectId: "1234567890",
   chains: [
      mainnet,
      polygon,
      optimism,
      arbitrum,
      base,
      ...(process.env.NEXT_PUBLIC_ENABLE_TESTNETS === "true" ? [sepolia] : []),
   ],
   ssr: true,
});
