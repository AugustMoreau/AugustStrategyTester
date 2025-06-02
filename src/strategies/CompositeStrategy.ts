import { ITradingStrategy, TradeAction, ParamDefinition, StrategyContext } from '../contracts/ITradingStrategy';

interface StrategyConfig {
  strategy: ITradingStrategy;
  weight: number;
  params: Record<string, any>;
}

export class CompositeStrategy implements ITradingStrategy {
  private strategies: StrategyConfig[];
  private name: string;
  
  constructor(strategies: StrategyConfig[]) {
    this.strategies = strategies;
    this.name = strategies.map(s => `${s.strategy.getName()} (${s.weight}%)`).join(' + ');
  }
  
  getName(): string {
    return this.name;
  }
  
  getDescription(): string {
    return `A weighted combination of multiple strategies: ${this.strategies.map(s => s.strategy.getName()).join(', ')}`;
  }
  
  getParamDefinitions(): ParamDefinition[] {
    // For composite strategies, params are handled differently through the UI
    // This could return a flattened list of all params from all strategies if needed
    return [];
  }
  
  evaluate(context: StrategyContext): TradeAction {
    let buyScore = 0;
    let sellScore = 0;
    let totalWeight = 0;
    let reasons: string[] = [];
    
    for (const { strategy, weight, params } of this.strategies) {
      // Create a context with strategy-specific params
      const strategyContext = {
        ...context,
        parameters: params
      };
      
      const action = strategy.evaluate(strategyContext);
      totalWeight += weight;
      
      if (action.type === 'BUY') {
        buyScore += weight * (action.amount / 100);
        reasons.push(`${strategy.getName()}: BUY ${action.reason ? `(${action.reason})` : ''}`);
      } else if (action.type === 'SELL') {
        sellScore += weight * (action.amount / 100);
        reasons.push(`${strategy.getName()}: SELL ${action.reason ? `(${action.reason})` : ''}`);
      } else {
        reasons.push(`${strategy.getName()}: HOLD ${action.reason ? `(${action.reason})` : ''}`);
      }
    }
    
    // Normalize scores
    buyScore = (buyScore / totalWeight) * 100;
    sellScore = (sellScore / totalWeight) * 100;
    
    // Decision threshold (50% of weighted vote)
    const threshold = 0.5;
    
    if (buyScore > sellScore && buyScore > threshold * 100) {
      return { 
        type: 'BUY', 
        amount: buyScore, 
        reason: `Combined signal (${buyScore.toFixed(1)}%): ${reasons.join('; ')}`
      };
    } else if (sellScore > buyScore && sellScore > threshold * 100) {
      return { 
        type: 'SELL', 
        amount: sellScore, 
        reason: `Combined signal (${sellScore.toFixed(1)}%): ${reasons.join('; ')}`
      };
    } else {
      return { 
        type: 'HOLD', 
        amount: 0, 
        reason: `No strong signal: ${reasons.join('; ')}`
      };
    }
  }
}
