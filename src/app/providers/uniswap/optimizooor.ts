import { BigNumber } from "@ethersproject/bignumber";
import { parseUnits } from "@ethersproject/units";
import { UniswapPairInfo } from "./service";

const SCALE = BigNumber.from(10).pow(18);
const PRECISION_SCALE = BigNumber.from(10).pow(36);

interface Exchange {
  id: number;
  bucketIn: BigNumber;
  bucketOut: BigNumber;
}

interface Split {
  id: number;
  amount: BigNumber;
}

export interface Swap {
  chainId: number;
  amountIn: string;
}

export class UniswapOptimizor {
  private readonly scale: BigNumber;
  private readonly precisionScale: BigNumber;

  constructor() {
    this.scale = SCALE;
    this.precisionScale = PRECISION_SCALE;
  }

  getSwapsToExecute(amountIn: string, pairs: UniswapPairInfo[]): Swap[] {
    // Format the exchanges to the expected format
    const exchanges = pairs.map((pair) => ({
      id: pair.chainId,
      bucketIn: BigNumber.from(pair.reserveIn),
      bucketOut: BigNumber.from(pair.reserveOut),
    }));

    const amountInBN = BigNumber.from(amountIn);
    const splits = this.calculate(amountInBN, exchanges);
    const adjustedSplits = this.adjustSplits(amountInBN, splits);

    return adjustedSplits.map(
      (split) =>
        ({
          chainId: split.id,
          amountIn: split.amount.toString(),
        } as Swap),
    );
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
          (exchange) => !temporarySplit.find((split) => split.id === exchange.id && split.amount.isNegative()),
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
        id: exchanges[i].id,
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
        id: split.id,
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

  getTestPairs(): UniswapPairInfo[] {
    // For test purposes only.
    // with const testAmountIn = parseUnits("100", 18); // 100 WETH
    // The expected output is:
    // [
    //   { chainId: 123, amountIn: '277777777777777777780' },
    //   { chainId: 234, amountIn: '138888888888888888888' },
    //   { chainId: 345, amountIn: '55555555555555555555' },
    //   { chainId: 456, amountIn: '27777777777777777777' }
    // ]

    return [
      {
        // id: 123,
        chainId: 123,
        address: "0x123",
        tokenIn: "WETH",
        tokenOut: "DAI",
        reserveIn: parseUnits("1000", 18).toString(), // 1000 WETH
        reserveOut: parseUnits("2000000", 18).toString(), // 2,000,000 DAI
      },
      {
        // id: 234,
        chainId: 234,
        address: "0x234",
        tokenIn: "WETH",
        tokenOut: "DAI",
        reserveIn: parseUnits("500", 18).toString(), // 500 WETH
        reserveOut: parseUnits("1000000", 18).toString(), // 1,000,000 DAI
      },
      {
        // id: 345,
        chainId: 345,
        address: "0x345",
        tokenIn: "WETH",
        tokenOut: "DAI",
        reserveIn: parseUnits("200", 18).toString(), // 200 WETH
        reserveOut: parseUnits("400000", 18).toString(), // 400,000 DAI
      },
      {
        // id: 456,
        chainId: 456,
        address: "0x456",
        tokenIn: "WETH",
        tokenOut: "DAI",
        reserveIn: parseUnits("100", 18).toString(), // 100 WETH
        reserveOut: parseUnits("200000", 18).toString(), // 200,000 DAI
      },
    ];
  }
}
