import { z } from "zod";

import { CreateAction, EvmWalletProvider } from "@coinbase/agentkit";
import { ActionProvider } from "@coinbase/agentkit";
import { Network } from "@coinbase/agentkit";

import { GetWalletInfoSchema, GetTokenBalancesSchema } from "./schemas";
import { formatUnits, Hex } from "viem";
import { UniswapService } from "../uniswap/service";
import { abi as erc20abi } from "../ABIs/erc20";
/**
 * CustomWalletActionProvider provides actions for getting basic wallet information.
 */
export class CustomWalletActionProvider extends ActionProvider {
  /**
   * Constructor for the WalletActionProvider.
   */
  constructor() {
    super("wallet", []);
  }

  /**
   * Gets the details of the connected wallet including address, network, and balance.
   *
   * @param walletProvider - The wallet provider to get the details from.
   * @param _ - Empty args object (not used).
   * @returns A formatted string containing the wallet details.
   */
  @CreateAction({
    name: "wallet_info",
    description: `
    Return information about the user connected wallet, including the address and native ETH balance.
    `,
    schema: GetWalletInfoSchema,
  })
  async getWalletInfo(walletProvider: EvmWalletProvider, _: z.infer<typeof GetWalletInfoSchema>): Promise<string> {
    console.log("[Action]: customWalletProvider.getWalletInfo");
    try {
      const address = walletProvider.getAddress();
      const balance = formatUnits(await walletProvider.getBalance(), 18);

      return `
        Your wallet address is ${address}. Your balance is ${balance} ETH.
      `;
    } catch (error) {
      return `Error getting wallet details: ${error}`;
    }
  }

  @CreateAction({
    name: "token_balances",
    description: `
    Return the balance of all tokens in the user's wallet.
    `,
    schema: GetTokenBalancesSchema,
  })
  async getTokenBalances(
    walletProvider: EvmWalletProvider,
    _: z.infer<typeof GetTokenBalancesSchema>,
  ): Promise<string> {
    console.log("[Action]: customWalletProvider.getTokenBalances");
    try {
      const walletAddress = walletProvider.getAddress();
      const chainId = parseInt(walletProvider.getNetwork().chainId!, 10);
      const st9000Address = UniswapService.knownTokensPerChain[chainId].ST9000;

      const ethBalance = formatUnits(await walletProvider.getBalance(), 18);

      const st9000Balance = await walletProvider.readContract({
        address: st9000Address as Hex,
        abi: erc20abi,
        functionName: "balanceOf",
        args: [walletAddress as Hex],
      });

      const st9000Decimals = await walletProvider.readContract({
        address: st9000Address as Hex,
        abi: erc20abi,
        functionName: "decimals",
        args: [],
      });

      const st9000BalanceFormatted = formatUnits(st9000Balance as bigint, st9000Decimals as number);

      return `Your ETH balance is ${ethBalance}. Your ST9000 balance is ${st9000BalanceFormatted}`;
    } catch (error) {
      return `Error getting token balances: ${error}`;
    }
  }

  /**
   * Checks if the wallet action provider supports the given network.
   * Since wallet actions are network-agnostic, this always returns true.
   *
   * @param _ - The network to check.
   * @returns True, as wallet actions are supported on all networks.
   */
  supportsNetwork = (_: Network): boolean => true;
}

/**
 * Factory function to create a new WalletActionProvider instance.
 *
 * @returns A new WalletActionProvider instance.
 */
export const customWalletActionProvider = () => new CustomWalletActionProvider();
