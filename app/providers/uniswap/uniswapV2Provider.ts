import { z } from "zod";
import { ActionProvider } from "@coinbase/agentkit";
import { Network } from "@coinbase/agentkit";
import { CreateAction } from "@coinbase/agentkit";
import { encodeFunctionData, Hex, parseUnits } from "viem";
import { EvmWalletProvider } from "@coinbase/agentkit";
import { uniswapSwapSchema } from "./schemas";
import { UniswapService } from "./service";

import { abi as superswapperabi } from "../ABIs/superswapper";
import { abi as erc20abi } from "../ABIs/erc20";
import { UniswapOptimizor } from "./optimizooor";

const SUPERSWAPPER_ADDRESS = "0x7B42F440353999e506f44CC955d12b3b8Dc7544B";

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
    console.log("Swap args", args);
    if (parseInt(amountIn, 10) > 1e18) {
      throw new Error(`Amount in is too large, did agent9000 get it wrong? ${amountIn}`);
    }

    const amountInAdjusted = parseUnits(amountIn, 18).toString();
    console.log("Adjusted amount in", amountInAdjusted);

    const uniswap = new UniswapService();
    const optimizooor = new UniswapOptimizor();

    const pairs = await uniswap.fetchPairsOnAllChains(tokenIn, tokenOut);
    console.log("=== Pairs from UniswapService ===");
    console.log(pairs);
    const swaps = optimizooor.getSwapsToExecute(amountInAdjusted, pairs);
    console.log("=== Swaps from Optimizooor ===");
    console.log(swaps);

    let chains = swaps.map((swap) => BigInt(swap.chainId));
    let amounts = swaps.map((swap) => BigInt(swap.amountIn));

    const amountsSum = amounts.reduce((acc, amount) => acc + amount, BigInt(0));
    const chainId = parseInt(walletProvider.getNetwork().chainId!, 10);
    const tokenInAddress = uniswap.getTokenAddress(chainId, tokenIn);

    // Approve superswapper the amount of tokens
    const approveHash = await walletProvider.sendTransaction({
      to: tokenInAddress as Hex,
      data: encodeFunctionData({
        abi: erc20abi,
        functionName: "approve",
        args: [SUPERSWAPPER_ADDRESS as Hex, amountsSum],
      }),
    });

    console.log("Approve hash", approveHash);

    const hash = await walletProvider.sendTransaction({
      to: SUPERSWAPPER_ADDRESS as Hex,
      data: encodeFunctionData({
        abi: superswapperabi,
        functionName: "initiateSwap",
        args: [tokenInAddress as Hex, amounts, chains],
      }),
    });

    console.log("Swap hash", hash);
    return hash;
  }

  supportsNetwork = (network: Network) => true;
}

export const uniswapV2ActionProvider = () => new UniswapV2ActionProvider();
