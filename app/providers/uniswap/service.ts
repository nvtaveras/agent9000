import { Hex, PublicClient } from "viem";
import { getViemClients } from "../viem/chains";
import { Pair } from "@uniswap/v2-sdk";
import { Token } from "@uniswap/sdk-core";
import { abi as uniswapAbi } from "../ABIs/uniswap";

export interface UniswapPairInfo {
  chainId: number;
  address: string;
  tokenIn: string;
  tokenOut: string;
  reserveIn: string;
  reserveOut: string;
}

export class UniswapService {
  private static readonly knownTokensPerChain: Record<number, Record<string, string>> = {
    8453: {
      // Base
      USDC: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
      ETH: "0x4200000000000000000000000000000000000006",
    },
    10: {
      // Optimism
      USDC: "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85",
      ETH: "0x4200000000000000000000000000000000000006",
    },
  };

  private static readonly decimalsPerToken: Record<string, number> = {
    "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913": 6,
    "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85": 6,
    "0x4200000000000000000000000000000000000006": 18,
  };

  private clients: PublicClient[];

  constructor() {
    this.clients = getViemClients();
  }

  public async fetchPairsOnAllChains(tokenIn: string, tokenOut: string): Promise<UniswapPairInfo[]> {
    const pairs = [];
    for (const client of this.clients) {
      const chainId = client.chain!.id;

      const tokenInAddress = UniswapService.knownTokensPerChain[chainId][tokenIn];
      const tokenOutAddress = UniswapService.knownTokensPerChain[chainId][tokenOut];

      const uniTokenIn = new Token(chainId, tokenInAddress, UniswapService.decimalsPerToken[tokenInAddress]);
      const uniTokenOut = new Token(chainId, tokenOutAddress, UniswapService.decimalsPerToken[tokenOutAddress]);

      const pairAddress = Pair.getAddress(uniTokenIn, uniTokenOut);

      const token0 = await client.readContract({
        address: pairAddress as Hex,
        abi: uniswapAbi,
        functionName: "token0",
      });

      const [reserve0, reserve1, _] = (await client.readContract({
        address: pairAddress as Hex,
        abi: uniswapAbi,
        functionName: "getReserves",
      })) as [bigint, bigint, number];

      const reserveIn = token0 === tokenInAddress ? reserve0 : reserve1;
      const reserveOut = token0 === tokenInAddress ? reserve1 : reserve0;

      pairs.push({
        chainId: client.chain!.id,
        address: pairAddress,
        tokenIn: tokenInAddress,
        tokenOut: tokenOutAddress,
        reserveIn: reserveIn.toString(),
        reserveOut: reserveOut.toString(),
      } as UniswapPairInfo);
    }

    return pairs;
  }
}
