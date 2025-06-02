import { ITradingStrategy } from './ITradingStrategy';
import { IExchangeAPIService } from './IExchangeAPIService';

export interface StrategyConfig {
  strategy: ITradingStrategy;
  weight: number;
  params: Record<string, any>;
}

export interface BacktestRequest {
  strategyConfigs: StrategyConfig[];
  exchangeService: IExchangeAPIService;
  symbol: string;
  interval: string;
  initialBalance: number;
  fromTimestamp: number;
  toTimestamp: number;
  takeProfitRatio: number; // Take profit ratio (1:X)
}

export interface TradeLog {
  entryTimestamp: number;
  exitTimestamp?: number;
  entryPrice: number;
  exitPrice?: number;
  type: 'LONG' | 'SHORT';
  quantity: number;
  pnl?: number;
  holdingPeriod?: string;
  reason?: string;
  exitReason?: string; // Can be 'Take Profit (1:X)', 'Stop Loss (1:1)', or 'Strategy Signal'
}

export interface BacktestResult {
  trades: TradeLog[];
  winRate: number;
  totalTrades: number;
  finalBalance: number;
  strategyName: string;
  profitFactor?: number;
  totalProfit?: number;
  totalLoss?: number;
  initialBalance?: number;
  maxDrawdown?: number;
  metadata?: Record<string, any>;
}

export interface IStrategyEngine {
  runBacktest(request: BacktestRequest): Promise<BacktestResult>;
}
