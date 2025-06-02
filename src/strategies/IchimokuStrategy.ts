import { ITradingStrategy, TradeAction, ParamDefinition, StrategyContext } from '../contracts/ITradingStrategy';
import { CandleData } from '../models/CandleData';

export class IchimokuStrategy implements ITradingStrategy {
  getName(): string {
    return 'Ichimoku Cloud';
  }
  
  getDescription(): string {
    return 'A comprehensive strategy that identifies support/resistance levels, momentum, trend direction and possible reversal points using multiple technical calculations.';
  }
  
  getParamDefinitions(): ParamDefinition[] {
    return [
      {
        name: 'tenkanPeriod',
        type: 'number',
        defaultValue: 9,
        label: 'Tenkan-sen Period',
        description: 'Number of periods for Tenkan-sen (Conversion Line). Acts as a short-term moving average and represents near-term support/resistance.',
        min: 5,
        max: 30,
        step: 1
      },
      {
        name: 'kijunPeriod',
        type: 'number',
        defaultValue: 26,
        label: 'Kijun-sen Period',
        description: 'Number of periods for Kijun-sen (Base Line). Acts as a medium-term moving average and represents medium-term support/resistance.',
        min: 10,
        max: 60,
        step: 1
      },
      {
        name: 'senkouSpanBPeriod',
        type: 'number',
        defaultValue: 52,
        label: 'Senkou Span B Period',
        description: 'Number of periods for Senkou Span B (one component of the "cloud"). Represents long-term support/resistance.',
        min: 30,
        max: 120,
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
    const tenkanPeriod = parameters.tenkanPeriod || 9;
    const kijunPeriod = parameters.kijunPeriod || 26;
    const senkouSpanBPeriod = parameters.senkouSpanBPeriod || 52;
    const displacement = 26; // Standard displacement (Chikou Span and cloud displacement)
    const tradeAmount = parameters.tradeAmount || 10;
    
    // Ensure we have enough data
    const requiredPeriods = Math.max(tenkanPeriod, kijunPeriod, senkouSpanBPeriod) + displacement;
    if (marketData.length < requiredPeriods) {
      return { type: 'HOLD', amount: 0, reason: 'Insufficient data for Ichimoku calculation' };
    }
    
    // Calculate Ichimoku components
    const tenkanSen = this.calculateTenkanSen(marketData, tenkanPeriod);
    const kijunSen = this.calculateKijunSen(marketData, kijunPeriod);
    
    // Calculate cloud components
    const senkouSpanA = (tenkanSen + kijunSen) / 2;
    const senkouSpanB = this.calculateSenkouSpanB(marketData, senkouSpanBPeriod);
    
    // Current price
    const currentPrice = marketData[marketData.length - 1].close;
    
    // Previous values (for crossover detection)
    const prevData = marketData.slice(0, -1);
    const prevTenkanSen = this.calculateTenkanSen(prevData, tenkanPeriod);
    const prevKijunSen = this.calculateKijunSen(prevData, kijunPeriod);
    
    // Trading logic
    let signal: TradeAction = { type: 'HOLD', amount: 0 };
    
    // TK Cross (Tenkan-sen crossing Kijun-sen)
    const bullishTKCross = prevTenkanSen < prevKijunSen && tenkanSen > kijunSen;
    const bearishTKCross = prevTenkanSen > prevKijunSen && tenkanSen < kijunSen;
    
    // Price relative to cloud
    const aboveCloud = currentPrice > Math.max(senkouSpanA, senkouSpanB);
    const belowCloud = currentPrice < Math.min(senkouSpanA, senkouSpanB);
    
    // Generate signals
    if (bullishTKCross && aboveCloud && !currentPosition) {
      signal = { 
        type: 'BUY', 
        amount: tradeAmount,
        reason: `Bullish TK Cross above cloud (Tenkan: ${tenkanSen.toFixed(2)}, Kijun: ${kijunSen.toFixed(2)})`
      };
    } else if (bearishTKCross && belowCloud && currentPosition) {
      signal = { 
        type: 'SELL', 
        amount: tradeAmount,
        reason: `Bearish TK Cross below cloud (Tenkan: ${tenkanSen.toFixed(2)}, Kijun: ${kijunSen.toFixed(2)})`
      };
    }
    
    return signal;
  }
  
  private calculateTenkanSen(data: CandleData[], period: number): number {
    if (data.length < period) {
      throw new Error(`Not enough data to calculate Tenkan-sen with period ${period}`);
    }
    
    const periodData = data.slice(-period);
    const highest = Math.max(...periodData.map(candle => candle.high));
    const lowest = Math.min(...periodData.map(candle => candle.low));
    
    return (highest + lowest) / 2;
  }
  
  private calculateKijunSen(data: CandleData[], period: number): number {
    if (data.length < period) {
      throw new Error(`Not enough data to calculate Kijun-sen with period ${period}`);
    }
    
    const periodData = data.slice(-period);
    const highest = Math.max(...periodData.map(candle => candle.high));
    const lowest = Math.min(...periodData.map(candle => candle.low));
    
    return (highest + lowest) / 2;
  }
  
  private calculateSenkouSpanB(data: CandleData[], period: number): number {
    if (data.length < period) {
      throw new Error(`Not enough data to calculate Senkou Span B with period ${period}`);
    }
    
    const periodData = data.slice(-period);
    const highest = Math.max(...periodData.map(candle => candle.high));
    const lowest = Math.min(...periodData.map(candle => candle.low));
    
    return (highest + lowest) / 2;
  }
}
