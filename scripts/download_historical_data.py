#!/usr/bin/env python3
"""
Download historical OHLCV data from Binance API for all supported cryptocurrencies and timeframes
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
INTERVALS = {
    "1m": {"limit_days": 7, "binance_code": "1m"},
    "5m": {"limit_days": 30, "binance_code": "5m"},
    "15m": {"limit_days": 90, "binance_code": "15m"},
    "1h": {"limit_days": 365, "binance_code": "1h"},
    "4h": {"limit_days": 365*2, "binance_code": "4h"},
    "1d": {"limit_days": 365*3, "binance_code": "1d"}
}

# Create data directory if it doesn't exist
# Use absolute path to ensure files are saved in the correct location
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
    
    if response.status_code != 200:
        print(f"Error fetching data: {response.status_code} - {response.text}")
        return []
    
    return response.json()

def fetch_all_historical_data(symbol, interval_info):
    """
    Fetch all historical data for a symbol and interval with pagination to handle API limits
    """
    interval_code = interval_info["binance_code"]
    days_limit = interval_info["limit_days"]
    
    # Calculate time window based on interval limits
    end_time = int(datetime.datetime.now().timestamp() * 1000)
    start_time = end_time - (days_limit * 24 * 60 * 60 * 1000)
    
    print(f"Downloading {days_limit} days of {interval_code} data for {symbol}...")
    
    all_candles = []
    current_start = start_time
    
    # Paginate through all data
    while current_start < end_time:
        # Set max end time for this batch
        batch_end = min(current_start + (1000 * get_interval_ms(interval_code)), end_time)
        
        # Fetch data for this batch
        candles = get_binance_historical_data(
            symbol=symbol,
            interval_code=interval_code,
            start_time=current_start,
            end_time=batch_end,
            limit=1000
        )
        
        if not candles:
            break
        
        # Add to collection
        all_candles.extend(candles)
        
        # Move to next batch
        if len(candles) < 1000:
            break
            
        # Start from the end of the last batch
        current_start = candles[-1][0] + 1
        
        # Rate limiting to avoid hitting API limits
        time.sleep(0.5)
    
    print(f"Downloaded {len(all_candles)} candles for {symbol} {interval_code}")
    return all_candles

def get_interval_ms(interval_code):
    """
    Convert interval code to milliseconds
    """
    if interval_code.endswith('m'):
        return int(interval_code[:-1]) * 60 * 1000
    elif interval_code.endswith('h'):
        return int(interval_code[:-1]) * 60 * 60 * 1000
    elif interval_code.endswith('d'):
        return int(interval_code[:-1]) * 24 * 60 * 60 * 1000
    return 60 * 1000  # default to 1 minute

def format_candles_for_application(candles):
    """
    Format kline data from Binance API to match the application's format
    
    Binance kline format:
    [
        0: Open time,
        1: Open price,
        2: High price,
        3: Low price,
        4: Close price,
        5: Volume,
        6: Close time,
        ...rest not needed
    ]
    
    App format:
    {
      "timestamp": 1717171200000,
      "open": 80500.0,
      "high": 82100.0,
      "low": 80200.0,
      "close": 81800.0,
      "volume": 3245680.0
    }
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
    Main function to download data for all symbols and intervals
    """
    print(f"Starting download of historical crypto data at {datetime.datetime.now()}")
    
    total_files = 0
    
    for symbol in SYMBOLS:
        for interval, info in INTERVALS.items():
            output_filename = f"{symbol}_{interval}.json"
            output_path = data_dir / output_filename
            
            # Check if file already exists
            if output_path.exists():
                print(f"File {output_filename} already exists, skipping...")
                total_files += 1
                continue
                
            try:
                # Download data
                raw_candles = fetch_all_historical_data(symbol, info)
                
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
                print(f"Error downloading {symbol} {interval}: {str(e)}")
    
    print(f"\nDownload complete! Created {total_files} data files in {data_dir}")

if __name__ == "__main__":
    main()
