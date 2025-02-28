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
    name: "swap",
    description: `
    Swaps tokens on Uniswap V2, using the best available price across all chains.

    It takes the following inputs:
    - tokenIn: The token to swap from
    - tokenOut: The token to swap to
    - amountIn: The amount of tokens to swap
    `,
    schema: uniswapSwapSchema,
  })
  async swap(walletProvider: EvmWalletProvider, args: z.infer<typeof uniswapSwapSchema>) {
    const { tokenIn, tokenOut, amountIn } = args;
    console.log("Swap args", args);
    if (parseInt(amountIn, 10) > 1e18) {
      throw new Error(`Amount in is too large, did agent9000 get it wrong? ${amountIn}`);
    }

    const amountInAdjusted = parseUnits(amountIn, 18).toString();
    console.log("Adjusted amount in", amountInAdjusted);

    const uniswap = new UniswapService();
    const optimizooor = new UniswapOptimizor();

    const pairs = await uniswap.fetchPairsOnAllChains(tokenIn, tokenOut);
    // console.log("=== Pairs from UniswapService ===");
    // console.log(pairs);
    const swaps = optimizooor.getSwapsToExecute(amountInAdjusted, optimizooor.getTestPairs());
    // console.log("=== Swaps from Optimizooor ===");
    // console.log(swaps);

    // Call initiateSwap(address tokenIn, uint256[] memory amounts, uint256[] memory chainIds)

    // Fake temporary tx hash
    return "0x705fe29da66de793ef443046a465c09784d05fb9c83ce968455b66a83ddda926";
  }

  supportsNetwork = (network: Network) => network.protocolFamily === "evm";
}

export const uniswapV2ActionProvider = () => new UniswapV2ActionProvider();
