import { Chain, defineChain } from "viem";

export const localChains: Chain[] = [
   {
      id: 31337,
      name: "Local Fork 1",
      nativeCurrency: {
         name: "Ethereum",
         symbol: "ETH",
         decimals: 18,
      },
      rpcUrls: {
         default: {
            http: ["http://localhost:9545"],
         },
         public: {
            http: ["http://localhost:9545"],
         },
      },
   },
   {
      id: 31338,
      name: "Local Fork 2",
      nativeCurrency: {
         name: "Ethereum",
         symbol: "ETH",
         decimals: 18,
      },
      rpcUrls: {
         default: {
            http: ["http://localhost:9546"],
         },
         public: {
            http: ["http://localhost:9546"],
         },
      },
   },
];

export const optimismFork = defineChain({
   id: 10,
   name: "Optimism fork",
   nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
   rpcUrls: {
      default: {
         http: ["http://localhost:9545"],
      },
   },
});

export const baseFork = defineChain({
   id: 8453,
   name: "Base fork",
   nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
   rpcUrls: {
      default: {
         http: ["http://localhost:9546"],
      },
   },
});

export const unichainFork = defineChain({
   id: 130,
   name: "Unichain fork",
   nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
   rpcUrls: {
      default: {
         http: ["http://localhost:9547"],
      },
   },
});

export const modeFork = defineChain({
   id: 34443,
   name: "Mode fork",
   nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
   rpcUrls: {
      default: {
         http: ["http://localhost:9548"],
      },
   },
});
