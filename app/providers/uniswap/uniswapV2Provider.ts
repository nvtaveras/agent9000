import { z } from "zod";
import { ActionProvider } from "@coinbase/agentkit";
import { Network } from "@coinbase/agentkit";
import { CreateAction } from "@coinbase/agentkit";
import { encodeFunctionData, Hex, parseUnits } from "viem";
import { EvmWalletProvider } from "@coinbase/agentkit";
import { uniswapSwapSchema } from "./schemas";
import { UniswapService } from "./service";

import { abi as superswapperabi } from "../ABIs/superswapper";
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
    name: "zap",
    description: `
    Execute a zap through Uniswap V2, using the best available price across all chains.

    It takes the following inputs:
    - tokenIn: The token to swap from
    - tokenOut: The token to swap to
    - amountIn: The amount of tokens to swap

    DO NOT MODIFY THE TOKEN SYMBOLS GIVEN BY THE USER.
    `,
    schema: uniswapSwapSchema,
  })
  async swap(
    walletProvider: EvmWalletProvider,
    args: z.infer<typeof uniswapSwapSchema>
  ) {
    const { tokenIn, tokenOut, amountIn } = args;
    console.log("Swap args", args);
    if (parseInt(amountIn, 10) > 1e18) {
      throw new Error(
        `Amount in is too large, did agent9000 get it wrong? ${amountIn}`
      );
    }

    const amountInAdjusted = parseUnits(amountIn, 18).toString();
    console.log("Adjusted amount in", amountInAdjusted);

    const uniswap = new UniswapService();
    const optimizooor = new UniswapOptimizor();

    const pairs = await uniswap.fetchPairsOnAllChains(tokenIn, tokenOut);
    console.log("=== Pairs from UniswapService ===");
    console.log(pairs);
    const swaps = optimizooor.getSwapsToExecute(
      amountInAdjusted,
      pairs
      // optimizooor.getTestPairs()
    );
    console.log("=== Swaps from Optimizooor ===");
    console.log(swaps);

    let chains = swaps.map((swap) => BigInt(swap.chainId));
    let amounts = swaps.map((swap) => BigInt(swap.amountIn));

    console.log(chains);
    console.log(amounts);

    chains = [BigInt(8453)];
    amounts = [BigInt(5e18)];

    const superSwapperAddress = "0xe05ba9c8827072e1508099E1797BA84baC657012";

    const hash = await walletProvider.sendTransaction({
      to: superSwapperAddress as Hex,
      data: encodeFunctionData({
        abi: superswapperabi,
        functionName: "initiateSwap",
        args: [
          args.tokenIn as Hex,
          chains,
          amounts,
          // args.token as Hex,
          // args.to as Hex,
          // args.amount,
          // BigInt(args.chainId),
        ],
      }),
    });

    // Call initiateSwap(address tokenIn, uint256[] memory amounts, uint256[] memory chainIds)

    // Fake temporary tx hash
    // return "0x705fe29da66de793ef443046a465c09784d05fb9c83ce968455b66a83ddda926";
    return hash;
  }

  supportsNetwork = (network: Network) => true;
}

export const uniswapV2ActionProvider = () => new UniswapV2ActionProvider();
