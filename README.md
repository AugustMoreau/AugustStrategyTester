# August Strategy Tester

A web application for backtesting cryptocurrency trading strategies on historical market data. This platform allows traders to test different strategies to find the ones with the highest win rates before risking real funds.

## Features

- **Strategy Selection**: Choose from multiple pre-built trading strategies or combine them with custom weights
- **Strategy Customization**: Adjust parameters for each strategy to optimize performance
- **Cryptocurrency Selection**: Test strategies on major cryptocurrencies (BTC, ETH, SOL, XRP)
- **Timeframe Selection**: Choose from standard trading timeframes (1m, 5m, 15m, 1h, 4h, 1d)
- **Backtest Results**: View comprehensive metrics including win rate, total trades, P&L, and more
- **Trade History**: Analyze detailed trade logs with entry/exit points and reasons for each trade

## Available Strategies

- **Moving Average Crossover**: Generates signals based on when fast MA crosses slow MA
- **RSI Overbought/Oversold**: Buys when RSI is oversold and sells when overbought
- **MACD Crossover**: Generates signals based on MACD line crossing the signal line
- **Bollinger Bands**: Two modes - bounce (trade reversals at bands) and squeeze (trade breakouts)
- **Stochastic Oscillator**: Identifies overbought/oversold conditions and potential trend reversals
- **Ichimoku Cloud**: Comprehensive trend-following system with multiple components
- **Parabolic SAR**: Trend-following indicator that identifies potential reversals
- **VWAP (Volume Weighted Average Price)**: Trading based on volume-weighted price levels
- **Composite Strategy**: Combine multiple strategies with custom weights for enhanced performance

## Project Structure

The project follows Clean Architecture principles with clear separation of concerns:

- **Domain Layer**: Core business logic, interfaces, and models
  - `contracts/`: Interface definitions
  - `models/`: Data structures and entities
  
- **Application Layer**: Orchestrates use cases
  - `services/`: Business logic implementations
  
- **Infrastructure Layer**: External integrations
  - `strategies/`: Strategy implementations
  - `exchange/`: Market data services
  
- **Presentation Layer**: User interface
  - `components/`: UI components
  - `App.tsx`: Main application component

## Installation

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn

### Setup

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/august-strategy-tester.git
   cd august-strategy-tester
   ```

2. Install dependencies:
   ```
   npm install
   # or
   yarn
   ```

3. Start the development server:
   ```
   npm run dev
   # or
   yarn dev
   ```

4. Open your browser and navigate to:
   ```
   http://localhost:3000
   ```

## Usage

1. Select a cryptocurrency and timeframe
2. Choose either a single strategy or combined strategies
3. Configure the strategy parameters
4. Set the backtest period
5. Click "Run Backtest" to see the results
6. Analyze the performance metrics and trade history

## Disclaimer

This tool is for educational and research purposes only. Past performance is not indicative of future results. No real funds are used or at risk when using this backtesting platform.

## License

MIT

---
