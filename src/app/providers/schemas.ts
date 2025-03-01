import { z } from "zod";

/**
 * Input schema for transfer action.
 */
export const TransferSchema = z
  .object({
    amount: z.custom<bigint>().describe("The amount of the asset to transfer"),
    token: z.string().describe("The contract address of the token to transfer"),
    to: z.string().describe("The destination to transfer the funds"),
    chainId: z.number().describe("The chainId of the destination chain"),
  })
  .strip()
  .describe("Instructions for transferring assets");
