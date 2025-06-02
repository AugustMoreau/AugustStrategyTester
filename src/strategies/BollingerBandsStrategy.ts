import { ITradingStrategy, TradeAction, ParamDefinition, StrategyContext } from '../contracts/ITradingStrategy';
import { CandleData } from '../models/CandleData';

interface BollingerBands {
  middle: number;
  upper: number;
  lower: number;
  bandwidth: number;
}

export class BollingerBandsStrategy implements ITradingStrategy {
  getName(): string {
    return 'Bollinger Bands';
  }
  
  getDescription(): string {
    return 'A strategy that generates buy signals when price touches the lower band and sell signals when price touches the upper band.';
  }
  
  getParamDefinitions(): ParamDefinition[] {
    return [
      {
        name: 'period',
        type: 'number',
        defaultValue: 20,
        label: 'Period',
        description: 'Number of candles used to calculate the moving average and standard deviation. Standard value is 20; affects how responsive bands are to price changes.',
        min: 5,
        max: 100,
        step: 1
      },
      {
        name: 'stdDev',
        type: 'number',
        defaultValue: 2,
        label: 'Standard Deviations',
        description: 'Width of bands as a multiple of standard deviation. Higher values create wider bands, resulting in fewer but potentially more reliable signals.',
        min: 1,
        max: 3,
        step: 0.1
      },
      {
        name: 'mode',
        type: 'select',
        defaultValue: 'bounce',
        label: 'Strategy Mode',
        description: 'Bounce: Trade when price touches the bands. Squeeze: Trade when volatility increases after a period of low volatility.',
        options: ['bounce', 'squeeze']
      },
      {
        name: 'squeezeThreshold',
        type: 'number',
        defaultValue: 0.1,
        label: 'Squeeze Threshold',
        description: 'Maximum bandwidth value that qualifies as a volatility squeeze. Lower values mean tighter squeezes before triggering trades.',
        min: 0.05,
        max: 0.5,
        step: 0.01
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
    const period = parameters.period || 20;
    const stdDev = parameters.stdDev || 2;
    const mode = parameters.mode || 'bounce';
    const squeezeThreshold = parameters.squeezeThreshold || 0.1;
    const tradeAmount = parameters.tradeAmount || 10;
    
    // Ensure we have enough data
    if (marketData.length < period + 10) {
      return { type: 'HOLD', amount: 0, reason: 'Insufficient data for Bollinger Bands calculation' };
    }
    
    // Calculate Bollinger Bands
    const currentCandle = marketData[marketData.length - 1];
    const currentPrice = currentCandle.close;
    const bands = this.calculateBollingerBands(marketData, period, stdDev);
    
    // Calculate previous bands (for squeeze detection)
    const prevBands = this.calculateBollingerBands(marketData.slice(0, -1), period, stdDev);
    
    if (mode === 'bounce') {
      // Bounce strategy: Buy at lower band, sell at upper band
      const touchingLower = currentPrice <= bands.lower;
      const touchingUpper = currentPrice >= bands.upper;
      
      if (touchingLower && !currentPosition) {
        return { 
          type: 'BUY', 
          amount: tradeAmount,
          reason: `Price (${currentPrice.toFixed(2)}) touched lower Bollinger Band (${bands.lower.toFixed(2)})`
        };
      } else if (touchingUpper && currentPosition) {
        return { 
          type: 'SELL', 
          amount: tradeAmount,
          reason: `Price (${currentPrice.toFixed(2)}) touched upper Bollinger Band (${bands.upper.toFixed(2)})`
        };
      }
    } else if (mode === 'squeeze') {
      // Squeeze strategy: Buy when bands expand after contraction
      const isSqueezed = bands.bandwidth < squeezeThreshold;
      const wasSqueezing = prevBands.bandwidth < squeezeThreshold;
      const isExpanding = bands.bandwidth > prevBands.bandwidth;
      
      // Buy on squeeze breakout (bands starting to expand after being squeezed)
      if (wasSqueezing && isExpanding && !isSqueezed && !currentPosition) {
        return { 
          type: 'BUY', 
          amount: tradeAmount,
          reason: `Bollinger Bands expanding after squeeze (bandwidth: ${bands.bandwidth.toFixed(3)})`
        };
      }
      
      // Sell when price reaches upper band after a squeeze breakout
      if (currentPosition && currentPrice >= bands.upper) {
        return { 
          type: 'SELL', 
          amount: tradeAmount,
          reason: `Price (${currentPrice.toFixed(2)}) reached upper band after squeeze breakout`
        };
      }
    }
    
    return { type: 'HOLD', amount: 0 };
  }
  
  private calculateBollingerBands(data: CandleData[], period: number, stdDev: number): BollingerBands {
    // Extract closing prices
    const prices = data.slice(-period).map(candle => candle.close);
    
    // Calculate SMA (middle band)
    const sum = prices.reduce((a, b) => a + b, 0);
    const middle = sum / period;
    
    // Calculate standard deviation
    const squaredDiffs = prices.map(price => Math.pow(price - middle, 2));
    const avgSquaredDiff = squaredDiffs.reduce((a, b) => a + b, 0) / period;
    const standardDeviation = Math.sqrt(avgSquaredDiff);
    
    // Calculate upper and lower bands
    const upper = middle + (standardDeviation * stdDev);
    const lower = middle - (standardDeviation * stdDev);
    
    // Calculate bandwidth for squeeze detection
    const bandwidth = (upper - lower) / middle;
    
    return { middle, upper, lower, bandwidth };
  }
}
