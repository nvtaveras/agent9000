import { encodeFunctionData, formatUnits, Hex, parseUnits, PublicClient } from "viem";
import { getViemClients } from "../viem/chains";
import { abi as uniswapAbi } from "../ABIs/uniswap";
import { abi as uniswapFactoryAbi } from "../ABIs/uniswapFactory";
import { abi as erc20abi } from "../ABIs/erc20";
import { abi as superswapperAbi } from "../ABIs/superswapper";
import { EvmWalletProvider } from "@coinbase/agentkit";
import { UniswapOptimizor } from "./optimizooor";
import { CHAIN_NAMES } from "@/config/chain-icons";

export interface UniswapPairInfo {
  chainId: number;
  address: string;
  tokenIn: string;
  tokenOut: string;
  reserveIn: string;
  reserveOut: string;
}

export interface SingleChainRoute {
  chainId: number;
  chainName: string;
  amountOut: string;
}

export interface OptimizedRouteStep {
  chainId: number;
  chainName: string;
  percentage: number;
  amountOut: string;
}

export interface SwapRoutes {
  optimizedRoute: {
    steps: OptimizedRouteStep[];
    totalAmountOut: string;
  };
  singleChainRoutes: SingleChainRoute[];
}

export class UniswapService {
   public static readonly SUPERSWAPPER_ADDRESS =
      "0x42d68F02E890fd91da05E24935e549bBeeCb4Dad";
   public static readonly knownTokensPerChain: Record<
      number,
      Record<string, string>
   > = {
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
      130: {
         // Unichain
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
      130: "0x1F98400000000000000000000000000000000002",
      34443: "0x50fD14F0eba5A678c1eBC16bDd3794f09362a95C",
   };

   private clients: PublicClient[];

   constructor() {
      this.clients = getViemClients();
   }

   public getTokenAddress(chainId: number, token: string): string {
      return UniswapService.knownTokensPerChain[chainId][token];
   }

   public async getPairAddress(
      client: PublicClient,
      tokenIn: string,
      tokenOut: string
   ): Promise<string> {
      const chainId = client.chain!.id;
      const factoryAddress = UniswapService.factoryPerChain[chainId];

      return await client.readContract({
         address: factoryAddress as Hex,
         abi: uniswapFactoryAbi,
         functionName: "getPair",
         args: [tokenIn as Hex, tokenOut as Hex],
      });
   }

   public async approveSuperSwapper(
      walletProvider: EvmWalletProvider,
      tokenIn: string,
      amount: bigint
   ): Promise<string> {
      const approveHash = await walletProvider.sendTransaction({
         to: tokenIn as Hex,
         data: encodeFunctionData({
            abi: erc20abi,
            functionName: "approve",
            args: [UniswapService.SUPERSWAPPER_ADDRESS as Hex, amount],
         }),
      });

      return approveHash;
   }

   public async initiateSwap(
      walletProvider: EvmWalletProvider,
      tokenIn: string,
      amounts: bigint[],
      chains: bigint[]
   ): Promise<string> {
      return await walletProvider.sendTransaction({
         to: UniswapService.SUPERSWAPPER_ADDRESS as Hex,
         data: encodeFunctionData({
            abi: superswapperAbi,
            functionName: "initiateSwap",
            args: [tokenIn as Hex, amounts, chains],
         }),
      });
   }

   public async fetchPairsOnAllChains(
      tokenIn: string,
      tokenOut: string
   ): Promise<UniswapPairInfo[]> {
      const pairs = [];
      for (const client of this.clients) {
         const chainId = client.chain!.id;

         const tokenInAddress =
            UniswapService.knownTokensPerChain[chainId][tokenIn];
         const tokenOutAddress =
            UniswapService.knownTokensPerChain[chainId][tokenOut];

         const pairAddress = await this.getPairAddress(
            client,
            tokenInAddress,
            tokenOutAddress
         );

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

  public async getAmountOut(tokenIn: string, tokenOut: string, amountIn: string): Promise<string> {
    const amountInWei = parseUnits(amountIn, 18).toString();

    const pairs = await this.fetchPairsOnAllChains(tokenIn, tokenOut);
    const optimizooor = new UniswapOptimizor();
    const swaps = optimizooor.getSwapsToExecute(amountInWei, pairs);

    const { totalAmountOut } = optimizooor.calculateSplitAmountOuts(pairs, swaps);

    return formatUnits(BigInt(totalAmountOut), 18);
  }

  public async getSwapRoutes(tokenIn: string, tokenOut: string, amountIn: string): Promise<SwapRoutes> {
    // This is a dummy implementation that will be replaced with real logic
    const amountInWei = parseUnits(amountIn, 18).toString();

    const pairs = await this.fetchPairsOnAllChains(tokenIn, tokenOut);
    const optimizooor = new UniswapOptimizor();
    const swaps = optimizooor.getSwapsToExecute(amountInWei, pairs);

    let { splitAmountOuts, totalAmountOut } = optimizooor.calculateSplitAmountOuts(pairs, swaps);
    let singleChainRoutes = optimizooor.calculateSingleExchangeAmountOuts(pairs, swaps);

    totalAmountOut = formatUnits(BigInt(totalAmountOut), 18);
    splitAmountOuts = splitAmountOuts.map((split) => ({
      ...split,
      amountOut: formatUnits(BigInt(split.amountOut), 18),
    }));
    singleChainRoutes = singleChainRoutes.map((route) => ({
      ...route,
      amountOut: formatUnits(BigInt(route.amountOut), 18),
    }));

    const optimizedRouteSteps = splitAmountOuts.map(
      (split) =>
        ({
          chainId: split.chainId,
          chainName: CHAIN_NAMES[split.chainId],
          percentage: parseFloat(Number(100 * (parseFloat(split.amountOut) / parseFloat(totalAmountOut))).toFixed(2)),
          amountOut: split.amountOut,
        } as OptimizedRouteStep),
    );

    const singleChainSteps = singleChainRoutes.map((route) => ({
      chainId: route.chainId,
      chainName: CHAIN_NAMES[route.chainId],
      amountOut: route.amountOut,
    }));

    return {
      optimizedRoute: {
        steps: optimizedRouteSteps,
        totalAmountOut: totalAmountOut,
      },
      singleChainRoutes: singleChainSteps,
    };
  }
}
