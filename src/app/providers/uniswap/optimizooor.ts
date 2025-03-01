import { BigNumber } from "@ethersproject/bignumber";
import { parseUnits } from "@ethersproject/units";
import { UniswapPairInfo } from "./service";

const SCALE = BigNumber.from(10).pow(18);
const PRECISION_SCALE = BigNumber.from(10).pow(36);
const FEE = BigNumber.from(997).mul(SCALE).div(1000); // 0.997 * 1e18

interface Exchange {
  id: number;
  bucketIn: BigNumber;
  bucketOut: BigNumber;
}

interface Split {
  chainId: number;
  amount: BigNumber;
}

interface SplitAmountOut {
  chainId: number;
  amountOut: string;
}

// export interface Swap {
//   chainId: number;
//   amountIn: string;
// }

export class UniswapOptimizor {
  private readonly scale: BigNumber;
  private readonly precisionScale: BigNumber;

  constructor() {
    this.scale = SCALE;
    this.precisionScale = PRECISION_SCALE;
  }

  getSwapsToExecute(amountIn: string, pairs: UniswapPairInfo[]): Split[] {
    // Format the exchanges to the expected format
    const exchanges = pairs.map((pair) => ({
      id: pair.chainId,
      bucketIn: BigNumber.from(pair.reserveIn),
      bucketOut: BigNumber.from(pair.reserveOut),
    }));

    const amountInBN = BigNumber.from(amountIn);
    const splits = this.calculate(amountInBN, exchanges);
    const adjustedSplits = this.adjustSplits(amountInBN, splits);

    return adjustedSplits;

    // return adjustedSplits.map(
    //   (split) =>
    //     ({
    //       chainId: split.chainId,
    //       amountIn: split.amount.toString(),
    //     } as Swap),
    // );
  }

  calculate(amountIn: BigNumber, exchanges: Exchange[]): Split[] {
    let splitFound = false;
    let splits: Split[] = [];
    let currentExchanges = [...exchanges];

    while (!splitFound) {
      let totalBucketIn = currentExchanges.reduce((sum, exchange) => sum.add(exchange.bucketIn), BigNumber.from(0));
      let totalBucketOut = currentExchanges.reduce((sum, exchange) => sum.add(exchange.bucketOut), BigNumber.from(0));

      let lambda = totalBucketOut.mul(this.precisionScale).div(totalBucketIn.add(amountIn));

      let temporarySplit: Split[] = this.calculateSplit(lambda, currentExchanges);

      if (temporarySplit.find((split) => split.amount.isNegative())) {
        currentExchanges = currentExchanges.filter(
          (exchange) => !temporarySplit.find((split) => split.chainId === exchange.id && split.amount.isNegative()),
        );
      } else {
        splitFound = true;
        return temporarySplit;
      }
    }

    return splits;
  }

  private calculateSplit(lambda: BigNumber, exchanges: Exchange[]): Split[] {
    let split: Split[] = [];
    for (let i = 0; i < exchanges.length; i++) {
      let exchangeAmount: BigNumber = exchanges[i].bucketOut
        .mul(this.precisionScale)
        .div(lambda)
        .sub(exchanges[i].bucketIn);

      split.push({
        chainId: exchanges[i].id,
        amount: exchangeAmount,
      });
    }
    return split;
  }

  adjustSplits(totalAmount: BigNumber, splits: Split[]): Split[] {
    let currentSum = splits.reduce((sum, split) => sum.add(split.amount), BigNumber.from(0));

    if (!currentSum.eq(totalAmount)) {
      // Proportional adjustment
      let adjustmentFactor = totalAmount.mul(this.scale).div(currentSum);
      splits = splits.map((split) => ({
        chainId: split.chainId,
        amount: split.amount.mul(adjustmentFactor).div(this.scale),
      }));

      // Handle any remaining rounding difference
      let adjustedSum = splits.reduce((sum, split) => sum.add(split.amount), BigNumber.from(0));
      let difference = totalAmount.sub(adjustedSum);
      if (!difference.isZero() && splits.length > 0) {
        splits[0].amount = splits[0].amount.add(difference);
      }
    }

    return splits;
  }

  // ======== Optimizooor code for calculating amount out from splits
  calculateAmountOut(amountIn: BigNumber, reserveIn: BigNumber, reserveOut: BigNumber): BigNumber {
    const numerator = amountIn.mul(reserveOut).mul(FEE);
    const denominator = reserveIn.add(amountIn).mul(SCALE);
    return numerator.div(denominator);
  }

  calculateSplitAmountOuts(
    exchanges: UniswapPairInfo[],
    splits: Split[],
  ): { splitAmountOuts: SplitAmountOut[]; totalAmountOut: string } {
    const splitAmountOuts: SplitAmountOut[] = [];
    let totalAmountOut = BigNumber.from(0);

    for (const exchange of exchanges) {
      if (!splits.find((split) => split.chainId === exchange.chainId)) {
        splitAmountOuts.push({
          chainId: exchange.chainId,
          amountOut: "0",
        });
      } else {
        const split = splits.find((split) => split.chainId === exchange.chainId);
        if (!split) {
          throw new Error("Split not found");
        }
        const amountOut = this.calculateAmountOut(
          BigNumber.from(split.amount),
          BigNumber.from(exchange.reserveIn),
          BigNumber.from(exchange.reserveOut),
        );
        splitAmountOuts.push({
          chainId: exchange.chainId,
          amountOut: amountOut.toString(),
        });
      }
    }
    totalAmountOut = splitAmountOuts.reduce((acc, curr) => acc.add(curr.amountOut), BigNumber.from(0));
    return { splitAmountOuts, totalAmountOut: totalAmountOut.toString() };
  }

  calculateSingleExchangeAmountOuts(exchanges: UniswapPairInfo[], splits: Split[]): SplitAmountOut[] {
    const splitAmountOuts: SplitAmountOut[] = [];
    const totalAmountIn = splits.reduce((acc, curr) => acc.add(BigNumber.from(curr.amount)), BigNumber.from(0));
    for (const exchange of exchanges) {
      const amountOut = this.calculateAmountOut(
        totalAmountIn,
        BigNumber.from(exchange.reserveIn),
        BigNumber.from(exchange.reserveOut),
      );
      splitAmountOuts.push({
        chainId: exchange.chainId,
        amountOut: amountOut.toString(),
      });
    }
    return splitAmountOuts;
  }
}
