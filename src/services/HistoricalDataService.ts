import { IExchangeAPIService, ExchangeRequest, ExchangeResponse } from '../contracts/IExchangeAPIService';
import { CandleData } from '../models/CandleData';

/**
 * Service that provides historical market data from pre-downloaded files
 * This approach avoids CORS issues and provides consistent backtesting results
 * without needing API connectivity
 */
export class HistoricalDataService implements IExchangeAPIService {
  private readonly dataPath = '/data'; // Path to data files relative to public folder
  private cachedData: Record<string, CandleData[]> = {};
  
  /**
   * Gets historical market data from pre-downloaded files for the specified symbol, interval, and date range
   */
  async getMarketData(request: ExchangeRequest): Promise<ExchangeResponse> {
    const { symbol, interval, fromTimestamp, toTimestamp } = request;
    
    try {
      // Generate unique key for this data set
      const dataKey = `${symbol}_${interval}`;
      
      // Try to get data from cache first
      let allCandles = this.cachedData[dataKey];
      
      // If not in cache, load from file
      if (!allCandles) {
        allCandles = await this.loadDataFile(symbol, interval);
        // Store in cache for future use
        this.cachedData[dataKey] = allCandles;
      }
      
      // Filter by date range if provided
      let filteredCandles = allCandles;
      if (fromTimestamp || toTimestamp) {
        filteredCandles = allCandles.filter(candle => {
          const timestamp = candle.timestamp;
          const afterStart = fromTimestamp ? timestamp >= fromTimestamp : true;
          const beforeEnd = toTimestamp ? timestamp <= toTimestamp : true;
          return afterStart && beforeEnd;
        });
      }
      
      // Check if we have enough data
      if (filteredCandles.length === 0) {
        console.warn(`No data available for ${symbol} with interval ${interval} in the selected date range`);
      } else {
        console.log(`Using ${filteredCandles.length} historical candles for ${symbol} with interval ${interval}`);
        
        // Sort by timestamp to ensure data is in chronological order
        filteredCandles.sort((a, b) => a.timestamp - b.timestamp);
      }
      
      return { candles: filteredCandles };
    } catch (error: any) {
      console.error(`Error loading historical data for ${symbol} (${interval}):`, error);
      const errorMessage = error.message || 'Unknown error';
      throw new Error(`Could not load historical data: ${errorMessage}. Make sure you have downloaded the historical data file for ${symbol}_${interval}.json`);
    }
  }
  
  /**
   * Loads historical data from a local file
   */
  private async loadDataFile(symbol: string, interval: string): Promise<CandleData[]> {
    try {
      // Generate filename based on symbol and interval (e.g., "BTCUSDT_1h.json")
      const filename = `${symbol}_${interval}.json`;
      const filePath = `${this.dataPath}/${filename}`;
      
      console.log(`Loading historical data file: ${filePath}`);
      
      const response = await fetch(filePath);
      if (!response.ok) {
        console.error(`HTTP Error: ${response.status} when loading ${filePath}`);
        throw new Error(`Failed to load historical data for ${symbol}_${interval}`);
      }
      
      const data = await response.json();
      console.log(`Data format check for ${symbol}_${interval}:`, {
        isArray: Array.isArray(data),
        length: Array.isArray(data) ? data.length : 'N/A',
        firstItem: Array.isArray(data) && data.length > 0 ? typeof data[0] : 'N/A'
      });
      
      // Handle both object format and Binance array format
      if (Array.isArray(data)) {
        // Convert from Binance format if needed
        if (typeof data[0] === 'object' && 'timestamp' in data[0]) {
          // Already in our format
          console.log(`Loaded ${data.length} candles for ${symbol}_${interval}`);
          return data;
        } else {
          // Convert from Binance array format
          const converted = data.map((item: any) => {
            return {
              timestamp: Number(item[0]),
              open: parseFloat(item[1]),
              high: parseFloat(item[2]),
              low: parseFloat(item[3]),
              close: parseFloat(item[4]),
              volume: parseFloat(item[5])
            };
          });
          console.log(`Converted ${converted.length} candles for ${symbol}_${interval}`);
          return converted;
        }
      } else {
        console.error(`Invalid data format for ${symbol}_${interval}:`, data);
        throw new Error(`Invalid data format for ${symbol}_${interval}`);
      }
    } catch (error: any) {
      console.error(`Error loading historical data: ${error instanceof Error ? error.message : String(error)}`);
      return [];
    }
  }
}
