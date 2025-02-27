import { z } from "zod";
// import { ActionProvider } from "../actionProvider";
import { ActionProvider } from "@coinbase/agentkit";
// import { Network } from "../../network";
import { Network } from "@coinbase/agentkit";
import { abi as bridgeAbi } from "./ABIs/bridge";
import { abi as erc20Abi } from "./ABIs/erc20";
// import { CreateAction } from "../actionDecorator";
import { CreateAction } from "@coinbase/agentkit";
import { TransferSchema } from "./schemas";
// import { abi } from "./constants";
import { Abi, encodeFunctionData, formatUnits, Hex, parseUnits } from "viem";
// import { EvmWalletProvider } from "../../wallet-providers";
import { EvmWalletProvider } from "@coinbase/agentkit";

/**
 * ERC20ActionProvider is an action provider for ERC20 tokens.
 */
export class SuperERC20ActionProvider extends ActionProvider<EvmWalletProvider> {
  /**
   * Constructor for the ERC20ActionProvider.
   */
  constructor() {
    super("superERC20", []);
  }

  /**
   * Transfers a specified amount of an ERC20 token to a destination onchain.
   *
   * @param walletProvider - The wallet provider to transfer the asset from.
   * @param args - The input arguments for the action.
   * @returns A message containing the transfer details.
   */
  @CreateAction({
    name: "crossChainTransfer",
    description: `
    This tool will transfer a SUPER ERC20 token from the wallet from one chain to another.

It takes the following inputs:
- _token: The token to transfer
- _to: The destination address
- _amount: The amount to transfer
- _chainId: The chainId of the destination chain
    `,
    schema: TransferSchema,
  })
  async transfer(
    walletProvider: EvmWalletProvider,
    args: z.infer<typeof TransferSchema>
  ): Promise<string> {
    try {
      // get token decimals
      const decimals = await walletProvider.readContract({
        address: args.token as Hex,
        abi: erc20Abi,
        functionName: "decimals",
      });

      const dec = parseInt(decimals as string);

      const hash = await walletProvider.sendTransaction({
        to: "0x4200000000000000000000000000000000000028" as Hex,
        data: encodeFunctionData({
          abi: bridgeAbi,
          functionName: "sendERC20",
          args: [
            args.token as Hex,
            args.to as Hex,
            args.amount,
            BigInt(args.chainId),
          ],
        }),
      });

      await walletProvider.waitForTransactionReceipt(hash);

      return `Transferred ${args.amount} of ${args.token} to ${args.to}.\nTransaction hash for the transfer: ${hash}`;
    } catch (error) {
      return `Error transferring the asset: ${error}`;
    }
  }

  /**
   * Checks if the ERC20 action provider supports the given network.
   *
   * @param network - The network to check.
   * @returns True if the ERC20 action provider supports the network, false otherwise.
   */
  supportsNetwork = (network: Network) => network.protocolFamily === "evm";
}

export const superERC20ActionProvider = () => new SuperERC20ActionProvider();
