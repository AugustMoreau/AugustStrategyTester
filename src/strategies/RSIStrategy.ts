import { ITradingStrategy, TradeAction, ParamDefinition, StrategyContext } from '../contracts/ITradingStrategy';
import { CandleData } from '../models/CandleData';

export class RSIStrategy implements ITradingStrategy {
  getName(): string {
    return 'RSI Overbought/Oversold';
  }
  
  getDescription(): string {
    return 'A strategy that generates buy signals when RSI is oversold and sell signals when RSI is overbought.';
  }
  
  getParamDefinitions(): ParamDefinition[] {
    return [
      {
        name: 'period',
        type: 'number',
        defaultValue: 14,
        label: 'RSI Period',
        description: 'Number of candles used to calculate the Relative Strength Index. Standard value is 14; lower values make RSI more sensitive to price changes.',
        min: 2,
        max: 50,
        step: 1
      },
      {
        name: 'oversoldThreshold',
        type: 'number',
        defaultValue: 30,
        label: 'Oversold Threshold',
        description: 'RSI value below this level triggers a buy signal. Lower values mean more conservative buy entries (deeper oversold conditions).',
        min: 10,
        max: 40,
        step: 1
      },
      {
        name: 'overboughtThreshold',
        type: 'number',
        defaultValue: 70,
        label: 'Overbought Threshold',
        description: 'RSI value above this level triggers a sell signal. Higher values mean more conservative sell entries (stronger overbought conditions).',
        min: 60,
        max: 90,
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
    const period = parameters.period || 14;
    const oversoldThreshold = parameters.oversoldThreshold || 30;
    const overboughtThreshold = parameters.overboughtThreshold || 70;
    const tradeAmount = parameters.tradeAmount || 10;
    
    // Ensure we have enough data
    if (marketData.length < period + 1) {
      return { type: 'HOLD', amount: 0, reason: 'Insufficient data for RSI calculation' };
    }
    
    // Calculate RSI
    const rsi = this.calculateRSI(marketData, period);
    
    // Generate signals based on RSI thresholds and current position
    if (rsi <= oversoldThreshold && !currentPosition) {
      return { 
        type: 'BUY', 
        amount: tradeAmount,
        reason: `RSI (${rsi.toFixed(2)}) is oversold (below ${oversoldThreshold})`
      };
    } else if (rsi >= overboughtThreshold && currentPosition) {
      return { 
        type: 'SELL', 
        amount: tradeAmount,
        reason: `RSI (${rsi.toFixed(2)}) is overbought (above ${overboughtThreshold})`
      };
    }
    
    return { type: 'HOLD', amount: 0 };
  }
  
  private calculateRSI(data: CandleData[], period: number): number {
    if (data.length <= period) {
      throw new Error(`Not enough data to calculate ${period} period RSI`);
    }
    
    // Get price changes
    const prices = data.map(candle => candle.close);
    const priceChanges: number[] = [];
    
    for (let i = 1; i < prices.length; i++) {
      priceChanges.push(prices[i] - prices[i - 1]);
    }
    
    // Calculate average gains and losses
    let sumGain = 0;
    let sumLoss = 0;
    
    // Initial average gain/loss
    for (let i = 0; i < period; i++) {
      const change = priceChanges[i];
      if (change > 0) {
        sumGain += change;
      } else {
        sumLoss -= change; // Convert to positive value
      }
    }
    
    let avgGain = sumGain / period;
    let avgLoss = sumLoss / period;
    
    // Calculate RSI using smoothed method
    for (let i = period; i < priceChanges.length; i++) {
      const change = priceChanges[i];
      if (change > 0) {
        avgGain = (avgGain * (period - 1) + change) / period;
        avgLoss = (avgLoss * (period - 1)) / period;
      } else {
        avgGain = (avgGain * (period - 1)) / period;
        avgLoss = (avgLoss * (period - 1) - change) / period;
      }
    }
    
    // Calculate RS and RSI
    if (avgLoss === 0) {
      return 100;
    }
    
    const rs = avgGain / avgLoss;
    return 100 - (100 / (1 + rs));
  }
}
