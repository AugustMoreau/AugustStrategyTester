import { ITradingStrategy, TradeAction, ParamDefinition, StrategyContext } from '../contracts/ITradingStrategy';
import { CandleData } from '../models/CandleData';

export class ParabolicSARStrategy implements ITradingStrategy {
  getName(): string {
    return 'Parabolic SAR';
  }
  
  getDescription(): string {
    return 'A trend-following indicator that places dots above or below price to indicate potential reversals. When dots move from above to below, it generates buy signals, and vice versa.';
  }
  
  getParamDefinitions(): ParamDefinition[] {
    return [
      {
        name: 'initialAcceleration',
        type: 'number',
        defaultValue: 0.02,
        label: 'Initial Acceleration',
        description: 'Starting value for the acceleration factor. Higher values make the indicator more responsive but can lead to more false signals.',
        min: 0.01,
        max: 0.1,
        step: 0.01
      },
      {
        name: 'maxAcceleration',
        type: 'number',
        defaultValue: 0.2,
        label: 'Max Acceleration',
        description: 'Maximum value for the acceleration factor. Limits how quickly the indicator can change direction.',
        min: 0.1,
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
    const initialAcceleration = parameters.initialAcceleration || 0.02;
    const maxAcceleration = parameters.maxAcceleration || 0.2;
    const tradeAmount = parameters.tradeAmount || 10;
    
    // Ensure we have enough data
    if (marketData.length < 3) {
      return { type: 'HOLD', amount: 0, reason: 'Insufficient data for Parabolic SAR calculation' };
    }
    
    // Calculate Parabolic SAR
    const sarResult = this.calculatePSAR(marketData, initialAcceleration, maxAcceleration);
    const currentSAR = sarResult.sar[sarResult.sar.length - 1];
    const prevSAR = sarResult.sar[sarResult.sar.length - 2];
    
    // Current price
    const currentPrice = marketData[marketData.length - 1].close;
    const prevPrice = marketData[marketData.length - 2].close;
    
    // Generate signals based on SAR crossover
    // SAR moved from above price to below price = Buy Signal
    if (prevSAR > prevPrice && currentSAR < currentPrice && !currentPosition) {
      return { 
        type: 'BUY', 
        amount: tradeAmount,
        reason: `Parabolic SAR crossed below price (SAR: ${currentSAR.toFixed(2)}, Price: ${currentPrice.toFixed(2)})`
      };
    } 
    // SAR moved from below price to above price = Sell Signal
    else if (prevSAR < prevPrice && currentSAR > currentPrice && currentPosition) {
      return { 
        type: 'SELL', 
        amount: tradeAmount,
        reason: `Parabolic SAR crossed above price (SAR: ${currentSAR.toFixed(2)}, Price: ${currentPrice.toFixed(2)})`
      };
    }
    
    return { type: 'HOLD', amount: 0 };
  }
  
  private calculatePSAR(data: CandleData[], initialAF: number, maxAF: number): { sar: number[] } {
    const sar: number[] = [];
    const high: number[] = data.map(candle => candle.high);
    const low: number[] = data.map(candle => candle.low);
    
    let isUptrend = false;
    let ep = 0; // Extreme point
    let af = initialAF; // Acceleration factor
    
    // Determine initial trend
    if (data[1].close > data[0].close) {
      isUptrend = true;
      ep = high[1]; // Initial extreme point is the first high
      sar.push(low[0]); // Initial SAR is the first low
    } else {
      isUptrend = false;
      ep = low[1]; // Initial extreme point is the first low
      sar.push(high[0]); // Initial SAR is the first high
    }
    
    // Calculate SAR for each period
    for (let i = 1; i < data.length; i++) {
      // Current SAR value
      const currentSAR = sar[i - 1] + af * (ep - sar[i - 1]);
      
      // If trend is up
      if (isUptrend) {
        // Check if new high
        if (high[i] > ep) {
          ep = high[i];
          af = Math.min(af + initialAF, maxAF);
        }
        
        // Ensure SAR is below the recent lows
        const limitedSAR = Math.min(currentSAR, low[i - 1], low[i - 2] || low[i - 1]);
        sar.push(limitedSAR);
        
        // Check for trend reversal
        if (low[i] < limitedSAR) {
          isUptrend = false;
          af = initialAF;
          ep = low[i];
          sar[i] = high[i]; // Reset SAR to current high
        }
      }
      // If trend is down
      else {
        // Check if new low
        if (low[i] < ep) {
          ep = low[i];
          af = Math.min(af + initialAF, maxAF);
        }
        
        // Ensure SAR is above the recent highs
        const limitedSAR = Math.max(currentSAR, high[i - 1], high[i - 2] || high[i - 1]);
        sar.push(limitedSAR);
        
        // Check for trend reversal
        if (high[i] > limitedSAR) {
          isUptrend = true;
          af = initialAF;
          ep = high[i];
          sar[i] = low[i]; // Reset SAR to current low
        }
      }
    }
    
    return { sar };
  }
}
