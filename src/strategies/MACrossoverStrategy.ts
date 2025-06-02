import { ITradingStrategy, TradeAction, ParamDefinition, StrategyContext } from '../contracts/ITradingStrategy';
import { CandleData } from '../models/CandleData';

export class MACrossoverStrategy implements ITradingStrategy {
  getName(): string {
    return 'MA Crossover';
  }
  
  getDescription(): string {
    return 'A strategy that generates buy signals when a short-term moving average crosses above a long-term moving average, and sell signals when it crosses below.';
  }
  
  getParamDefinitions(): ParamDefinition[] {
    return [
      {
        name: 'shortPeriod',
        type: 'number',
        defaultValue: 9,
        label: 'Short MA Period',
        description: 'Number of candles for calculating the short-term moving average. Smaller values are more responsive to recent price changes.',
        min: 2,
        max: 50,
        step: 1
      },
      {
        name: 'longPeriod',
        type: 'number',
        defaultValue: 21,
        label: 'Long MA Period',
        description: 'Number of candles for calculating the long-term moving average. Larger values provide more stable trend identification.',
        min: 5,
        max: 200,
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
    const shortPeriod = parameters.shortPeriod || 9;
    const longPeriod = parameters.longPeriod || 21;
    const tradeAmount = parameters.tradeAmount || 10;
    
    // Ensure we have enough data
    if (marketData.length < longPeriod + 1) {
      return { type: 'HOLD', amount: 0, reason: 'Insufficient data for MA calculation' };
    }
    
    // Calculate short and long MAs for current and previous candles
    const currentShortMA = this.calculateSMA(marketData, shortPeriod);
    const currentLongMA = this.calculateSMA(marketData, longPeriod);
    
    // Get previous values (one candle back)
    const prevData = marketData.slice(0, -1);
    const prevShortMA = this.calculateSMA(prevData, shortPeriod);
    const prevLongMA = this.calculateSMA(prevData, longPeriod);
    
    // Detect crossovers
    const crossedAbove = prevShortMA <= prevLongMA && currentShortMA > currentLongMA;
    const crossedBelow = prevShortMA >= prevLongMA && currentShortMA < currentLongMA;
    
    // Generate signals based on crossovers and current position
    if (crossedAbove && !currentPosition) {
      return { 
        type: 'BUY', 
        amount: tradeAmount,
        reason: `Short MA (${currentShortMA.toFixed(2)}) crossed above Long MA (${currentLongMA.toFixed(2)})`
      };
    } else if (crossedBelow && currentPosition) {
      return { 
        type: 'SELL', 
        amount: tradeAmount,
        reason: `Short MA (${currentShortMA.toFixed(2)}) crossed below Long MA (${currentLongMA.toFixed(2)})`
      };
    }
    
    return { type: 'HOLD', amount: 0 };
  }
  
  private calculateSMA(data: CandleData[], period: number): number {
    if (data.length < period) {
      throw new Error(`Not enough data to calculate ${period} period MA`);
    }
    
    const prices = data.slice(-period).map(candle => candle.close);
    const sum = prices.reduce((total, price) => total + price, 0);
    return sum / period;
  }
}
