import { IExchangeAPIService, ExchangeRequest, ExchangeResponse } from '../contracts/IExchangeAPIService';
import { CandleData } from '../models/CandleData';

export class BinanceService implements IExchangeAPIService {
  private readonly API_BASE_URL = 'https://api.binance.com/api/v3';
  private readonly FALLBACK_TO_SAMPLE_DATA = false; // Using real data from Binance API

  async getMarketData(request: ExchangeRequest): Promise<ExchangeResponse> {
    const { symbol, interval, fromTimestamp, toTimestamp } = request;
    
    try {
      if (this.FALLBACK_TO_SAMPLE_DATA) {
        // Generate sample data for demo/development
        console.log('Using sample data for', symbol);
        const candles = this.generateSampleData(symbol, interval, fromTimestamp, toTimestamp);
        return { candles };
      }
      
      // Build URL for Binance API
      let url = `${this.API_BASE_URL}/klines?symbol=${symbol}&interval=${interval}`;
      
      // Add optional parameters if provided
      if (fromTimestamp) url += `&startTime=${fromTimestamp}`;
      if (toTimestamp) url += `&endTime=${toTimestamp}`;
      
      // Make the actual API call
      console.log('Fetching data from Binance API:', url);
      const response = await fetch(url);
      
      // Check if the request was successful
      if (!response.ok) {
        throw new Error(`Binance API error: ${response.status} ${response.statusText}`);
      }
      
      // Parse the response
      const data = await response.json();
      
      // Log success
      console.log(`Successfully retrieved data from Binance API`);
      
      // Transform Binance data format to our CandleData format
      // Binance format: [time, open, high, low, close, volume, ...]
      const candles: CandleData[] = data.map((candle: any[]) => ({
        timestamp: candle[0],
        open: parseFloat(candle[1]),
        high: parseFloat(candle[2]),
        low: parseFloat(candle[3]),
        close: parseFloat(candle[4]),
        volume: parseFloat(candle[5])
      }));
      
      return { candles };
    } catch (error) {
      console.error('Error fetching market data:', error);
      
      // Only fallback to sample data if explicitly configured to do so
      if (this.FALLBACK_TO_SAMPLE_DATA) {
        console.warn('API request failed. Falling back to sample data.');
      } else {
        // Re-throw the error if we're not using fallback data
        throw new Error(`Failed to fetch real market data: ${error}`);
      }
      const candles = this.generateSampleData(symbol, interval, fromTimestamp, toTimestamp);
      return { candles };
    }
  }
  
  private generateSampleData(symbol: string, interval: string, fromTimestamp?: number, toTimestamp?: number): CandleData[] {
    const candles: CandleData[] = [];
    
    // Set starting price based on the symbol
    let lastClose = this.getStartingPrice(symbol);
    
    // Default to last 100 days if timestamps not provided
    const endTime = toTimestamp || Date.now();
    const startTime = fromTimestamp || endTime - (100 * 24 * 60 * 60 * 1000); // 100 days in milliseconds
    
    // Determine candle interval in milliseconds
    const intervalMs = this.intervalToMilliseconds(interval);
    
    // Create candles from start to end time
    for (let time = startTime; time <= endTime; time += intervalMs) {
      // Generate random price movement (between -2% and +2%)
      const priceChange = lastClose * (Math.random() * 0.04 - 0.02);
      const open = lastClose;
      const close = open + priceChange;
      const high = Math.max(open, close) * (1 + Math.random() * 0.01); // Up to 1% higher
      const low = Math.min(open, close) * (1 - Math.random() * 0.01);  // Up to 1% lower
      const volume = lastClose * (Math.random() * 100 + 50);  // Random volume
      
      candles.push({
        timestamp: time,
        open,
        high,
        close,
        low,
        volume
      });
      
      lastClose = close;
    }
    
    return candles;
  }
  
  private getStartingPrice(symbol: string): number {
    // Set realistic starting prices based on the symbol as of 2025
    switch (symbol) {
      case 'BTCUSDT': return 80000 + Math.random() * 6000; // BTC around 80-86k
      case 'ETHUSDT': return 6000 + Math.random() * 1000;  // ETH around 6-7k
      case 'SOLUSDT': return 200 + Math.random() * 50;     // SOL around 200-250
      case 'XRPUSDT': return 1.5 + Math.random() * 0.5;    // XRP around 1.5-2
      default: return 100 + Math.random() * 10;            // Generic price
    }
  }
  
  private intervalToMilliseconds(interval: string): number {
    const unit = interval.charAt(interval.length - 1);
    const value = parseInt(interval.substring(0, interval.length - 1));
    
    switch (unit) {
      case 'm': return value * 60 * 1000; // minutes
      case 'h': return value * 60 * 60 * 1000; // hours
      case 'd': return value * 24 * 60 * 60 * 1000; // days
      case 'w': return value * 7 * 24 * 60 * 60 * 1000; // weeks
      default: return value * 60 * 1000; // default to minutes
    }
  }
}
