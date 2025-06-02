import { CandleData } from '../models/CandleData';

export interface ExchangeRequest {
  symbol: string;
  interval: string;
  limit?: number;
  fromTimestamp?: number;
  toTimestamp?: number;
}

export interface ExchangeResponse {
  candles: CandleData[];
}

export interface IExchangeAPIService {
  getMarketData(request: ExchangeRequest): Promise<ExchangeResponse>;
}
