import { ITradingStrategy, TradeAction, ParamDefinition, StrategyContext } from '../contracts/ITradingStrategy';
import { CandleData } from '../models/CandleData';

export class VWAPStrategy implements ITradingStrategy {
  getName(): string {
    return 'VWAP';
  }
  
  getDescription(): string {
    return 'Volume-Weighted Average Price strategy that generates signals based on price action around the VWAP line, providing insights into the true average price considering volume.';
  }
  
  getParamDefinitions(): ParamDefinition[] {
    return [
      {
        name: 'period',
        type: 'number',
        defaultValue: 14,
        label: 'VWAP Period',
        description: 'Number of candles used to calculate the VWAP. Longer periods create a more stable line less prone to false signals.',
        min: 5,
        max: 100,
        step: 1
      },
      {
        name: 'deviation',
        type: 'number',
        defaultValue: 1.5,
        label: 'Deviation Multiplier',
        description: 'Multiplier for standard deviation bands around VWAP. Higher values require stronger price movements to generate signals.',
        min: 0.5,
        max: 3,
        step: 0.1
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
    const period = parameters.period || 14;
    const deviation = parameters.deviation || 1.5;
    const tradeAmount = parameters.tradeAmount || 10;
    
    // Ensure we have enough data
    if (marketData.length < period) {
      return { type: 'HOLD', amount: 0, reason: 'Insufficient data for VWAP calculation' };
    }
    
    // Calculate VWAP and standard deviation
    const vwapData = this.calculateVWAP(marketData, period);
    const vwap = vwapData.vwap;
    const upperBand = vwap + (vwapData.standardDeviation * deviation);
    const lowerBand = vwap - (vwapData.standardDeviation * deviation);
    
    // Current price
    const currentPrice = marketData[marketData.length - 1].close;
    const prevPrice = marketData[marketData.length - 2].close;
    
    // Generate signals based on price relative to VWAP and bands
    // Price crossed below VWAP from above and was above upper band previously
    const crossedBelowVWAP = prevPrice > vwap && currentPrice < vwap;
    const crossedAboveVWAP = prevPrice < vwap && currentPrice > vwap;
    const wasAboveUpperBand = prevPrice > upperBand;
    const wasBelowLowerBand = prevPrice < lowerBand;
    
    if (crossedAboveVWAP && wasBelowLowerBand && !currentPosition) {
      return { 
        type: 'BUY', 
        amount: tradeAmount,
        reason: `Price crossed above VWAP from oversold area (Price: ${currentPrice.toFixed(2)}, VWAP: ${vwap.toFixed(2)})`
      };
    } else if (crossedBelowVWAP && wasAboveUpperBand && currentPosition) {
      return { 
        type: 'SELL', 
        amount: tradeAmount,
        reason: `Price crossed below VWAP from overbought area (Price: ${currentPrice.toFixed(2)}, VWAP: ${vwap.toFixed(2)})`
      };
    }
    
    return { type: 'HOLD', amount: 0 };
  }
  
  private calculateVWAP(data: CandleData[], period: number): { vwap: number, standardDeviation: number } {
    // Use the most recent 'period' number of candles
    const periodData = data.slice(-period);
    
    // Calculate typical price * volume for each candle
    const typicalPriceVolume = periodData.map(candle => {
      const typicalPrice = (candle.high + candle.low + candle.close) / 3;
      return { 
        typicalPrice, 
        volume: candle.volume || 1, // Default to 1 if volume data is missing
        typicalPriceVolume: typicalPrice * (candle.volume || 1)
      };
    });
    
    // Calculate sum of price*volume and sum of volume
    const sumTypicalPriceVolume = typicalPriceVolume.reduce((sum, item) => sum + item.typicalPriceVolume, 0);
    const sumVolume = typicalPriceVolume.reduce((sum, item) => sum + item.volume, 0);
    
    // Calculate VWAP
    const vwap = sumTypicalPriceVolume / sumVolume;
    
    // Calculate standard deviation for bands
    const sumSquaredDifferences = typicalPriceVolume.reduce((sum, item) => {
      const difference = item.typicalPrice - vwap;
      return sum + (difference * difference * item.volume);
    }, 0);
    
    const standardDeviation = Math.sqrt(sumSquaredDifferences / sumVolume);
    
    return { vwap, standardDeviation };
  }
}
