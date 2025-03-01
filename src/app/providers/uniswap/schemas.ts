import { z } from "zod";

export const uniswapSwapSchema = z.object({
  tokenIn: z.string().describe("The token to swap from"),
  tokenOut: z.string().describe("The token to swap to"),
  amountIn: z.string().describe("The amount of tokens to swap"),
});
