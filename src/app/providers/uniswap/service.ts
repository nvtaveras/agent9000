import { Hex, PublicClient } from "viem";
import { getViemClients } from "../viem/chains";
import { Pair } from "@uniswap/v2-sdk";
import { Token } from "@uniswap/sdk-core";
import { abi as uniswapAbi } from "../ABIs/uniswap";
import { abi as uniswapFactoryAbi } from "../ABIs/uniswapFactory";

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
      ST9000: "0xcD630A5bDBb4DA3d1c79237bB326b1293950935D",
      ETH: "0x4200000000000000000000000000000000000024",
    },
    10: {
      // Optimism
      ST9000: "0xcD630A5bDBb4DA3d1c79237bB326b1293950935D",
      ETH: "0x4200000000000000000000000000000000000024",
    },
    34443: {
      // Mode
      ST9000: "0xcD630A5bDBb4DA3d1c79237bB326b1293950935D",
      ETH: "0x4200000000000000000000000000000000000024",
    },
  };

  private static readonly decimalsPerToken: Record<string, number> = {
    "0xcD630A5bDBb4DA3d1c79237bB326b1293950935D": 18,
    "0x4200000000000000000000000000000000000024": 18,
  };

  private static readonly factoryPerChain: Record<number, string> = {
    10: "0x0c3c1c532F1e39EdF36BE9Fe0bE1410313E074Bf",
    8453: "0x8909Dc15e40173Ff4699343b6eB8132c65e18eC6",
    34443: "0x50fD14F0eba5A678c1eBC16bDd3794f09362a95C",
  };

  private clients: PublicClient[];

  constructor() {
    this.clients = getViemClients();
  }

  public getTokenAddress(chainId: number, token: string): string {
    return UniswapService.knownTokensPerChain[chainId][token];
  }

  public async getPairAddress(client: PublicClient, tokenIn: string, tokenOut: string): Promise<string> {
    const chainId = client.chain!.id;
    const factoryAddress = UniswapService.factoryPerChain[chainId];

    return await client.readContract({
      address: factoryAddress as Hex,
      abi: uniswapFactoryAbi,
      functionName: "getPair",
      args: [tokenIn as Hex, tokenOut as Hex],
    });
  }

  public async fetchPairsOnAllChains(tokenIn: string, tokenOut: string): Promise<UniswapPairInfo[]> {
    const pairs = [];
    for (const client of this.clients) {
      const chainId = client.chain!.id;

      // const tokenInAddress =tokenIn;
      const tokenInAddress = UniswapService.knownTokensPerChain[chainId][tokenIn];
      // const tokenOutAddress = tokenOut;
      const tokenOutAddress = UniswapService.knownTokensPerChain[chainId][tokenOut];

      console.log("tokenInAddress", tokenInAddress);
      console.log("tokenOutAddress", tokenOutAddress);

      const uniTokenIn = new Token(chainId, tokenInAddress, UniswapService.decimalsPerToken[tokenInAddress]);
      const uniTokenOut = new Token(chainId, tokenOutAddress, UniswapService.decimalsPerToken[tokenOutAddress]);

      // const pairAddress = Pair.getAddress(uniTokenIn, uniTokenOut);
      const pairAddress = await this.getPairAddress(client, tokenInAddress, tokenOutAddress);
      console.log("pair for chain id", chainId, "=>", pairAddress);
      // console.log("Pair address", pairAddress);

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
