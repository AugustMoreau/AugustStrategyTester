/**
 * This script generates historical price data files for the AugustStrategyTester
 * It creates sample historical data for different cryptocurrencies and timeframes
 * with realistic price movements based on recent price ranges.
 */

const fs = require('fs');
const path = require('path');

// Directory to save the data files
const DATA_DIR = path.join(__dirname, '../public/data');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  console.log(`Created data directory: ${DATA_DIR}`);
}

// Cryptocurrency configuration with realistic price ranges as of 2025
const CRYPTO_CONFIG = {
  'BTCUSDT': {
    name: 'Bitcoin',
    basePrice: 82000,        // Base price around $82,000
    volatility: 0.02,        // Daily volatility (2%)
    minPrice: 78000,
    maxPrice: 86000
  },
  'ETHUSDT': {
    name: 'Ethereum',
    basePrice: 6500,         // Base price around $6,500
    volatility: 0.025,       // Daily volatility (2.5%)
    minPrice: 6000,
    maxPrice: 7000
  },
  'SOLUSDT': {
    name: 'Solana',
    basePrice: 220,          // Base price around $220
    volatility: 0.035,       // Daily volatility (3.5%)
    minPrice: 200,
    maxPrice: 250
  },
  'XRPUSDT': {
    name: 'Ripple',
    basePrice: 1.8,          // Base price around $1.80
    volatility: 0.03,        // Daily volatility (3%)
    minPrice: 1.5,
    maxPrice: 2.0
  }
};

// Timeframes and their configurations
const TIMEFRAMES = {
  '1m': { 
    milliseconds: 60 * 1000, 
    historyDays: 7,    // 1-minute data: max 7 days of history
    trend: 'volatile'
  },
  '5m': { 
    milliseconds: 5 * 60 * 1000, 
    historyDays: 30,   // 5-minute data: max 30 days
    trend: 'volatile'
  },
  '15m': { 
    milliseconds: 15 * 60 * 1000, 
    historyDays: 90,   // 15-minute data: max 90 days
    trend: 'mixed'
  },
  '1h': { 
    milliseconds: 60 * 60 * 1000, 
    historyDays: 365,  // 1-hour data: max 1 year
    trend: 'mixed'
  },
  '4h': { 
    milliseconds: 4 * 60 * 60 * 1000, 
    historyDays: 365 * 2,  // 4-hour data: max 2 years
    trend: 'bullish'
  },
  '1d': { 
    milliseconds: 24 * 60 * 60 * 1000, 
    historyDays: 365 * 3,  // 1-day data: max 3 years
    trend: 'bullish'
  }
};

/**
 * Generate a semi-realistic price time series with trends and volatility
 */
function generatePriceSeries(config, timeframe, startTime, endTime) {
  const candles = [];
  const interval = TIMEFRAMES[timeframe].milliseconds;
  const { basePrice, volatility, minPrice, maxPrice } = config;
  const trend = TIMEFRAMES[timeframe].trend;
  
  // Trend factors
  const trendFactors = {
    'bullish': 0.0002,  // Slight upward trend
    'bearish': -0.0002, // Slight downward trend
    'mixed': 0,         // No overall trend
    'volatile': 0       // No overall trend, but more volatility
  };
  
  const trendFactor = trendFactors[trend] || 0;
  const volatilityFactor = trend === 'volatile' ? volatility * 1.5 : volatility;
  
  let currentPrice = basePrice;
  let lastClose = currentPrice;
  
  // Generate candles at fixed intervals
  for (let time = startTime; time <= endTime; time += interval) {
    // Apply trend and random movement
    const randomFactor = (Math.random() * 2 - 1) * volatilityFactor;
    const trendImpact = trendFactor * (time - startTime) / interval;
    const priceChange = lastClose * (randomFactor + trendImpact);
    
    let open = lastClose;
    let close = open + priceChange;
    
    // Ensure price stays within reasonable bounds
    close = Math.max(close, minPrice);
    close = Math.min(close, maxPrice);
    
    const high = Math.max(open, close) * (1 + Math.random() * volatilityFactor * 0.5);
    const low = Math.min(open, close) * (1 - Math.random() * volatilityFactor * 0.5);
    const volume = close * (Math.random() * 100 + 50);
    
    candles.push({
      timestamp: time,
      open,
      high,
      low,
      close,
      volume
    });
    
    lastClose = close;
  }
  
  return candles;
}

/**
 * Generate and save historical data files
 */
function generateHistoricalData() {
  const now = Date.now();
  let fileCount = 0;
  
  // For each symbol and timeframe, generate a data file
  for (const symbol in CRYPTO_CONFIG) {
    for (const timeframe in TIMEFRAMES) {
      const config = CRYPTO_CONFIG[symbol];
      const { historyDays } = TIMEFRAMES[timeframe];
      
      // Calculate start and end times
      const endTime = now;
      const startTime = endTime - (historyDays * 24 * 60 * 60 * 1000);
      
      console.log(`Generating ${historyDays} days of ${timeframe} data for ${config.name} (${symbol})...`);
      
      // Generate candle data
      const candles = generatePriceSeries(config, timeframe, startTime, endTime);
      
      // Write to file
      const filename = `${symbol}_${timeframe}.json`;
      const filePath = path.join(DATA_DIR, filename);
      
      fs.writeFileSync(filePath, JSON.stringify(candles, null, 2));
      console.log(`Saved ${candles.length} candles to ${filename}`);
      fileCount++;
    }
  }
  
  console.log(`\nSuccessfully generated ${fileCount} historical data files in ${DATA_DIR}`);
  console.log(`These files will be used by the HistoricalDataService for backtesting.`);
}

// Execute the data generation
generateHistoricalData();
