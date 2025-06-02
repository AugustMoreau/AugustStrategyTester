import { CandleData } from '../models/CandleData';
import { Position } from '../models/Position';

export type TradeActionType = 'BUY' | 'SELL' | 'HOLD';

export interface TradeAction {
  type: TradeActionType;
  amount: number; // Percentage of balance (0-100)
  reason?: string;
}

export type ParamType = 'number' | 'string' | 'boolean' | 'select';

export interface ParamDefinition {
  name: string;
  type: ParamType;
  defaultValue: any;
  label: string;
  description: string; // Description for the tooltip
  min?: number;
  max?: number;
  step?: number;
  options?: string[] | number[];
}

export interface StrategyContext {
  marketData: CandleData[];
  balance: number;
  currentPosition?: Position;
  parameters: Record<string, any>;
  currentIndex: number; // Current candle index being evaluated
}

export interface ITradingStrategy {
  evaluate(context: StrategyContext): TradeAction;
  getName(): string;
  getDescription(): string;
  getParamDefinitions(): ParamDefinition[];
}
