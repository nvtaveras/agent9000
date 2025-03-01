"use client";

import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import {
   optimismFork,
   baseFork,
   modeFork,
   unichainFork,
} from "@/config/chains";

export const config = getDefaultConfig({
   appName: "Agent 9000",
   projectId: "1234567890",
   chains: [optimismFork, baseFork, modeFork, unichainFork],
   ssr: true,
});
