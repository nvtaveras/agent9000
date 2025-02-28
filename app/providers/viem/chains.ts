import { createPublicClient, createWalletClient, defineChain, http, PublicClient } from "viem";

const chains = {
  optimism: {
    id: 10,
    rpcUrl: "http://localhost:9545",
  },
  base: {
    id: 8453,
    rpcUrl: "http://localhost:9546",
  },
  mode: {
    id: 34443,
    rpcUrl: "http://localhost:9547",
  },
};

export function getViemClients(): PublicClient[] {
  return Object.keys(chains).map((chain) => {
    return createPublicClient({
      chain: defineChain({
        id: chains[chain as keyof typeof chains].id,
        name: `${chain} fork`,
        nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
        rpcUrls: {
          default: {
            http: [chains[chain as keyof typeof chains].rpcUrl],
          },
        },
      }),
      transport: http(),
    });
  });
}
