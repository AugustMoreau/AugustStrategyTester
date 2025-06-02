#!/usr/bin/env python3
"""
Download historical 1h OHLCV data from Binance API for all supported cryptocurrencies
and save them in the proper format for AugustStrategyTester's HistoricalDataService.
"""

import os
import json
import time
import datetime
import requests
from pathlib import Path

# Configuration
SYMBOLS = ["BTCUSDT", "ETHUSDT", "SOLUSDT", "XRPUSDT"]
INTERVAL = "1h"
LIMIT_DAYS = 365  # 1 year of data

# Create data directory if it doesn't exist
script_dir = Path(os.path.dirname(os.path.abspath(__file__)))
project_root = script_dir.parent
data_dir = project_root / "public" / "data"
data_dir.mkdir(parents=True, exist_ok=True)

print(f"Data will be saved to {data_dir}")

# Binance API endpoint for historical klines (candles)
KLINES_URL = "https://api.binance.com/api/v3/klines"

def get_binance_historical_data(symbol, interval_code, start_time, end_time=None, limit=1000):
    """
    Fetch historical kline data from Binance API
    """
    params = {
        "symbol": symbol,
        "interval": interval_code,
        "startTime": int(start_time),
        "limit": limit
    }
    
    if end_time:
        params["endTime"] = int(end_time)
    
    response = requests.get(KLINES_URL, params=params)
    if response.status_code == 200:
        return response.json()
    else:
        print(f"Error {response.status_code}: {response.text}")
        return []

def fetch_all_historical_data(symbol):
    """
    Download all available historical data for a given symbol and interval
    """
    now = datetime.datetime.now()
    end_time = int(now.timestamp() * 1000)
    start_time = int((now - datetime.timedelta(days=LIMIT_DAYS)).timestamp() * 1000)
    
    all_candles = []
    
    print(f"Downloading {symbol} {INTERVAL} data for the past {LIMIT_DAYS} days...")
    
    # Binance API returns a maximum of 1000 candles per request
    # We need to make multiple requests to get all the data
    while start_time < end_time:
        candles = get_binance_historical_data(symbol, INTERVAL, start_time, end_time, 1000)
        
        if not candles:
            break
        
        all_candles.extend(candles)
        
        # Update start_time for the next batch
        start_time = candles[-1][0] + 1  # Start from the next timestamp after the last received candle
        
        print(f"Downloaded {len(candles)} candles, total: {len(all_candles)}")
        
        # Rate limiting to avoid hitting API limits
        time.sleep(0.5)
    
    print(f"Downloaded {len(all_candles)} candles for {symbol} {INTERVAL}")
    return all_candles

def format_candles_for_application(candles):
    """
    Format kline data from Binance API to match the application's format
    """
    formatted = []
    
    for candle in candles:
        formatted.append({
            "timestamp": candle[0],    # Open time
            "open": float(candle[1]),  # Open price
            "high": float(candle[2]),  # High price
            "low": float(candle[3]),   # Low price
            "close": float(candle[4]), # Close price
            "volume": float(candle[5]) # Volume
        })
    
    return formatted

def main():
    """
    Main function to download 1h data for all symbols
    """
    print(f"Starting download of 1h historical crypto data at {datetime.datetime.now()}")
    
    total_files = 0
    
    for symbol in SYMBOLS:
        output_filename = f"{symbol}_1h.json"
        output_path = data_dir / output_filename
        
        try:
            # Download data
            raw_candles = fetch_all_historical_data(symbol)
            
            # Format data for the application
            formatted_candles = format_candles_for_application(raw_candles)
            
            # Save to JSON file
            with open(output_path, 'w') as f:
                json.dump(formatted_candles, f)
            
            print(f"Saved {len(formatted_candles)} candles to {output_filename}")
            total_files += 1
            
            # Sleep to avoid API rate limits
            time.sleep(1)
        
        except Exception as e:
            print(f"Error downloading {symbol}: {str(e)}")
    
    print(f"\nDownload complete! Created {total_files} data files in {data_dir}")

if __name__ == "__main__":
    main()
