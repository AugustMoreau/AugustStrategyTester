import { ITradingStrategy, TradeAction, ParamDefinition, StrategyContext } from '../contracts/ITradingStrategy';

interface MACD {
  macd: number;
  signal: number;
  histogram: number;
}

export class MACDStrategy implements ITradingStrategy {
  getName(): string {
    return 'MACD Crossover';
  }
  
  getDescription(): string {
    return 'A strategy that generates buy signals when the MACD line crosses above the signal line, and sell signals when it crosses below.';
  }
  
  getParamDefinitions(): ParamDefinition[] {
    return [
      {
        name: 'fastPeriod',
        type: 'number',
        defaultValue: 12,
        label: 'Fast EMA Period',
        description: 'Period length for the fast Exponential Moving Average. Lower values make it more responsive to recent price movements. Standard value is 12.',
        min: 2,
        max: 50,
        step: 1
      },
      {
        name: 'slowPeriod',
        type: 'number',
        defaultValue: 26,
        label: 'Slow EMA Period',
        description: 'Period length for the slow Exponential Moving Average. Higher values provide more smoothing and focus on longer-term trends. Standard value is 26.',
        min: 5,
        max: 100,
        step: 1
      },
      {
        name: 'signalPeriod',
        type: 'number',
        defaultValue: 9,
        label: 'Signal Period',
        description: 'Number of candles used to calculate the signal line (EMA of MACD line). Affects how quickly the signal line responds to changes in the MACD line. Standard value is 9.',
        min: 2,
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
    const fastPeriod = parameters.fastPeriod || 12;
    const slowPeriod = parameters.slowPeriod || 26;
    const signalPeriod = parameters.signalPeriod || 9;
    const tradeAmount = parameters.tradeAmount || 10;
    
    // Ensure we have enough data
    const minDataPoints = Math.max(fastPeriod, slowPeriod, signalPeriod) * 2;
    if (marketData.length < minDataPoints) {
      return { type: 'HOLD', amount: 0, reason: 'Insufficient data for MACD calculation' };
    }
    
    // Calculate MACD
    const prices = marketData.map(candle => candle.close);
    const currentMACD = this.calculateMACD(prices, fastPeriod, slowPeriod, signalPeriod);
    
    // Calculate previous MACD
    const prevPrices = prices.slice(0, -1);
    const prevMACD = this.calculateMACD(prevPrices, fastPeriod, slowPeriod, signalPeriod);
    
    // Detect crossovers
    const crossedAbove = prevMACD.macd <= prevMACD.signal && currentMACD.macd > currentMACD.signal;
    const crossedBelow = prevMACD.macd >= prevMACD.signal && currentMACD.macd < currentMACD.signal;
    
    // Generate signals based on crossovers and current position
    if (crossedAbove && !currentPosition) {
      return { 
        type: 'BUY', 
        amount: tradeAmount,
        reason: `MACD (${currentMACD.macd.toFixed(2)}) crossed above Signal (${currentMACD.signal.toFixed(2)})`
      };
    } else if (crossedBelow && currentPosition) {
      return { 
        type: 'SELL', 
        amount: tradeAmount,
        reason: `MACD (${currentMACD.macd.toFixed(2)}) crossed below Signal (${currentMACD.signal.toFixed(2)})`
      };
    }
    
    return { type: 'HOLD', amount: 0 };
  }
  
  private calculateEMA(prices: number[], period: number): number[] {
    const ema: number[] = [];
    const multiplier = 2 / (period + 1);
    
    // Start with SMA for the first value
    let sum = 0;
    for (let i = 0; i < period; i++) {
      sum += prices[i];
    }
    ema.push(sum / period);
    
    // Calculate EMA for the rest
    for (let i = period; i < prices.length; i++) {
      ema.push(
        (prices[i] - ema[ema.length - 1]) * multiplier + ema[ema.length - 1]
      );
    }
    
    return ema;
  }
  
  private calculateMACD(prices: number[], fastPeriod: number, slowPeriod: number, signalPeriod: number): MACD {
    // Calculate fast and slow EMAs
    const fastEMA = this.calculateEMA(prices, fastPeriod);
    const slowEMA = this.calculateEMA(prices, slowPeriod);
    
    // Calculate MACD line
    const macdLine: number[] = [];
    for (let i = 0; i < slowEMA.length; i++) {
      const fastIndex = fastEMA.length - slowEMA.length + i;
      if (fastIndex >= 0) {
        macdLine.push(fastEMA[fastIndex] - slowEMA[i]);
      }
    }
    
    // Calculate signal line (EMA of MACD line)
    const signalLine = this.calculateEMA(macdLine, signalPeriod);
    
    // Calculate histogram
    const histogram = macdLine[macdLine.length - 1] - signalLine[signalLine.length - 1];
    
    return {
      macd: macdLine[macdLine.length - 1],
      signal: signalLine[signalLine.length - 1],
      histogram
    };
  }
}
