import { ITradingStrategy, TradeAction, ParamDefinition, StrategyContext } from '../contracts/ITradingStrategy';
import { CandleData } from '../models/CandleData';

export class StochasticStrategy implements ITradingStrategy {
  getName(): string {
    return 'Stochastic Oscillator';
  }
  
  getDescription(): string {
    return 'A momentum strategy that compares a security\'s closing price to its price range over a specific period. Generates signals when the oscillator crosses above or below specific thresholds.';
  }
  
  getParamDefinitions(): ParamDefinition[] {
    return [
      {
        name: 'kPeriod',
        type: 'number',
        defaultValue: 14,
        label: 'K Period',
        description: 'Number of periods for %K line calculation. Represents the main stochastic line and measures current price relative to the high-low range.',
        min: 5,
        max: 50,
        step: 1
      },
      {
        name: 'dPeriod',
        type: 'number',
        defaultValue: 3,
        label: 'D Period',
        description: 'Number of periods for %D line calculation. This is a moving average of %K and helps identify trend reversals.',
        min: 1,
        max: 20,
        step: 1
      },
      {
        name: 'overbought',
        type: 'number',
        defaultValue: 80,
        label: 'Overbought Level',
        description: 'Level above which the market is considered overbought, suggesting a potential sell signal.',
        min: 50,
        max: 95,
        step: 1
      },
      {
        name: 'oversold',
        type: 'number',
        defaultValue: 20,
        label: 'Oversold Level',
        description: 'Level below which the market is considered oversold, suggesting a potential buy signal.',
        min: 5,
        max: 50,
        step: 1
      },
      {
        name: 'tradeAmount',
        type: 'number',
        defaultValue: 10,
        label: 'Trade Amount (%)',
        description: 'Percentage of available balance to use for each trade.',
        min: 1,
        max: 100,
        step: 1
      }
    ];
  }
  
  evaluate(context: StrategyContext): TradeAction {
    const { marketData, parameters, currentPosition } = context;
    
    // Extract parameters with defaults
    const kPeriod = parameters.kPeriod || 14;
    const dPeriod = parameters.dPeriod || 3;
    const overbought = parameters.overbought || 80;
    const oversold = parameters.oversold || 20;
    const tradeAmount = parameters.tradeAmount || 10;
    
    // Ensure we have enough data
    if (marketData.length < kPeriod + dPeriod) {
      return { type: 'HOLD', amount: 0, reason: 'Insufficient data for Stochastic calculation' };
    }
    
    // Calculate %K and %D for current and previous candles
    const stochValues = this.calculateStochastic(marketData, kPeriod, dPeriod);
    const currentK = stochValues.k[stochValues.k.length - 1];
    const currentD = stochValues.d[stochValues.d.length - 1];
    
    const prevK = stochValues.k[stochValues.k.length - 2];
    const prevD = stochValues.d[stochValues.d.length - 2];
    
    // Generate signals based on Stochastic crossing thresholds
    if (prevK < prevD && currentK > currentD && currentK < oversold && !currentPosition) {
      return { 
        type: 'BUY', 
        amount: tradeAmount,
        reason: `Stochastic bullish crossover in oversold region (K: ${currentK.toFixed(2)}, D: ${currentD.toFixed(2)})`
      };
    } else if (prevK > prevD && currentK < currentD && currentK > overbought && currentPosition) {
      return { 
        type: 'SELL', 
        amount: tradeAmount,
        reason: `Stochastic bearish crossover in overbought region (K: ${currentK.toFixed(2)}, D: ${currentD.toFixed(2)})`
      };
    }
    
    return { type: 'HOLD', amount: 0 };
  }
  
  private calculateStochastic(data: CandleData[], kPeriod: number, dPeriod: number): { k: number[], d: number[] } {
    if (data.length < kPeriod) {
      throw new Error(`Not enough data to calculate ${kPeriod} period Stochastic`);
    }
    
    const kValues: number[] = [];
    
    // Calculate %K values
    for (let i = kPeriod - 1; i < data.length; i++) {
      const periodData = data.slice(i - kPeriod + 1, i + 1);
      const highestHigh = Math.max(...periodData.map(candle => candle.high));
      const lowestLow = Math.min(...periodData.map(candle => candle.low));
      const currentClose = data[i].close;
      
      // Calculate %K
      const k = lowestLow !== highestHigh ? 
        ((currentClose - lowestLow) / (highestHigh - lowestLow)) * 100 : 
        50; // Default if high equals low
      
      kValues.push(k);
    }
    
    // Calculate %D values (simple moving average of %K)
    const dValues: number[] = [];
    for (let i = dPeriod - 1; i < kValues.length; i++) {
      const sum = kValues.slice(i - dPeriod + 1, i + 1).reduce((acc, val) => acc + val, 0);
      const d = sum / dPeriod;
      dValues.push(d);
    }
    
    // Adjust K values to match D values length
    const adjustedK = kValues.slice(dPeriod - 1);
    
    return { k: adjustedK, d: dValues };
  }
}
