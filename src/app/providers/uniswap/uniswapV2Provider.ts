import { z } from "zod";
import { ActionProvider } from "@coinbase/agentkit";
import { Network } from "@coinbase/agentkit";
import { CreateAction } from "@coinbase/agentkit";
import { parseUnits } from "viem";
import { EvmWalletProvider } from "@coinbase/agentkit";
import { uniswapSwapSchema } from "./schemas";
import { UniswapService } from "./service";

import { UniswapOptimizor } from "./optimizooor";

export class UniswapV2ActionProvider extends ActionProvider<EvmWalletProvider> {
  constructor() {
    super("uniswapV2", []);
  }

  /**
   * Swaps tokens on Uniswap V2.
   *
   * @param walletProvider - The wallet provider to use for the operation.
   * @param args - The input arguments for the action.
   * @returns The result of the swap.
   */
  @CreateAction({
    name: "superswap",
    description: `
    Execute a superchain swap through Uniswap V2, using the best available price across all chains.

    It takes the following inputs:
    - tokenIn: The token to swap from
    - tokenOut: The token to swap to
    - amountIn: The amount of tokens to swap

    IMPORTANT:
    - After completing the transaction, always show the user the transaction hash. Do not include a link to the explorer but just the hash.
    `,
    schema: uniswapSwapSchema,
  })
  async swap(walletProvider: EvmWalletProvider, args: z.infer<typeof uniswapSwapSchema>) {
    const { tokenIn, tokenOut, amountIn } = args;
    if (parseInt(amountIn, 10) > 1e18) {
      throw new Error(`Amount in is too large, did agent9000 get it wrong? ${amountIn}`);
    }

    const amountInAdjusted = parseUnits(amountIn, 18).toString();

    console.log("=== Swap args ===");
    console.log(`tokenIn: ${tokenIn} | tokenOut: ${tokenOut} | amountIn: ${amountIn} (wei: ${amountInAdjusted})`);
    console.log();

    const uniswap = new UniswapService();
    const optimizooor = new UniswapOptimizor();

    const pairs = await uniswap.fetchPairsOnAllChains(tokenIn, tokenOut);

    console.log("=== Pairs from UniswapService ===");
    console.log(pairs);
    console.log();

    const swaps = optimizooor.getSwapsToExecute(amountInAdjusted, pairs);
    const swapsFormatted = swaps.map((swap) => ({
      chainId: swap.chainId,
      amount: swap.amount.toString(),
    }));

    console.log("=== Swaps from Optimizooor ===");
    console.log(swapsFormatted);
    console.log();

    let chains = swaps.map((swap) => BigInt(swap.chainId));
    let amounts = swaps.map((swap) => BigInt(swap.amount.toString()));

    const amountsSum = amounts.reduce((acc, amount) => acc + amount, BigInt(0));
    const chainId = parseInt(walletProvider.getNetwork().chainId!, 10);
    const tokenInAddress = uniswap.getTokenAddress(chainId, tokenIn);

    console.log(`Approving ${amountsSum} ${tokenIn} for SuperSwapper`);
    const approveHash = await uniswap.approveSuperSwapper(walletProvider, tokenInAddress, amountsSum);
    console.log(`Approve tx: ${approveHash}`);

    const swapHash = await uniswap.initiateSwap(walletProvider, tokenInAddress, amounts, chains);
    console.log(`Swap tx: ${swapHash}`);

    return swapHash;
  }

  supportsNetwork = (network: Network) => true;
}

export const uniswapV2ActionProvider = () => new UniswapV2ActionProvider();
