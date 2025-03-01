import { Chain } from "viem";

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
