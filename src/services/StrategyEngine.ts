import { BacktestRequest, BacktestResult, IStrategyEngine, TradeLog } from '../contracts/IStrategyEngine';
import { TradeAction, StrategyContext } from '../contracts/ITradingStrategy';
import { CandleData } from '../models/CandleData';
import { Position } from '../models/Position';

export class StrategyEngine implements IStrategyEngine {
  async runBacktest(request: BacktestRequest): Promise<BacktestResult> {
    const { 
      strategyConfigs, 
      exchangeService, 
      symbol, 
      interval, 
      initialBalance, 
      fromTimestamp, 
      toTimestamp 
    } = request;

    // Step 1: Fetch market data
    const marketData = await this.fetchMarketData(exchangeService, symbol, interval, fromTimestamp, toTimestamp);
    
    if (marketData.length < 2) {
      throw new Error('Insufficient market data for backtest');
    }

    // Step 2: Initialize backtest state
    let balance = initialBalance;
    let currentPosition: Position | undefined = undefined;
    const trades: TradeLog[] = [];
    
    // Get combined strategy name for result
    const strategyName = strategyConfigs.length === 1 
      ? strategyConfigs[0].strategy.getName()
      : `Combined: ${strategyConfigs.map(sc => `${sc.strategy.getName()} (${sc.weight}%)`).join(', ')}`;

    // Extract take profit ratio from request
    const { takeProfitRatio } = request;
    
    // Step 3: Main backtest loop
    for (let i = 50; i < marketData.length; i++) { // Start at 50 to allow for indicators that need history
      const currentCandle = marketData[i];
      
      // Check for take profit or stop loss if position is open
      if (currentPosition) {
        // Fixed stop loss percentage is 1%
        const stopLossPercent = 0.01;
        
        if (currentPosition.type === 'LONG') {
          // Calculate fixed stop loss price (1% below entry)
          const stopLossPrice = currentPosition.entryPrice * (1 - stopLossPercent);
          
          // Calculate take profit price based on ratio
          // If ratio is 3, then take profit is 3% (3 times the 1% risk)
          const takeProfitPercent = stopLossPercent * takeProfitRatio;
          const takeProfitPrice = currentPosition.entryPrice * (1 + takeProfitPercent);
          
          // Check if take profit triggered
          if (currentCandle.high >= takeProfitPrice) {
            // Close position at take profit level
            const exitPrice = takeProfitPrice;
            const pnl = (exitPrice - currentPosition.entryPrice) * currentPosition.quantity;
            
            // Update balance
            balance += pnl;
            
            // Complete trade log
            const lastTrade = trades[trades.length - 1];
            if (lastTrade && !lastTrade.exitTimestamp) {
              lastTrade.exitTimestamp = currentCandle.timestamp;
              lastTrade.exitPrice = exitPrice;
              lastTrade.pnl = pnl;
              lastTrade.holdingPeriod = this.formatHoldingPeriod(
                currentCandle.timestamp - lastTrade.entryTimestamp
              );
              lastTrade.exitReason = `Take Profit (1:${takeProfitRatio})`;
            }
            
            // Reset position
            currentPosition = undefined;
            continue; // Skip to next candle
          }
          
          // Check if stop loss triggered
          if (currentCandle.low <= stopLossPrice) {
            // Close position at stop loss level
            const exitPrice = stopLossPrice;
            const pnl = (exitPrice - currentPosition.entryPrice) * currentPosition.quantity;
            
            // Update balance
            balance += pnl;
            
            // Complete trade log
            const lastTrade = trades[trades.length - 1];
            if (lastTrade && !lastTrade.exitTimestamp) {
              lastTrade.exitTimestamp = currentCandle.timestamp;
              lastTrade.exitPrice = exitPrice;
              lastTrade.pnl = pnl;
              lastTrade.holdingPeriod = this.formatHoldingPeriod(
                currentCandle.timestamp - lastTrade.entryTimestamp
              );
              lastTrade.exitReason = 'Stop Loss (1:1)';
            }
            
            // Reset position
            currentPosition = undefined;
            continue; // Skip to next candle
          }
        }
        
        // Add SHORT position logic if needed in the future
      }
      
      // Create context for strategy evaluation
      const context: StrategyContext = {
        marketData: marketData.slice(0, i + 1), // Only include data up to current candle
        balance,
        currentPosition,
        parameters: {}, // We'll fill this with combined parameters
        currentIndex: i
      };

      // Get weighted trade action from strategies
      const action = this.getWeightedTradeAction(strategyConfigs, context);
      
      // Process the trade action
      if (action.type === 'BUY' && !currentPosition) {
        // Calculate how much to buy based on percentage
        const amount = (action.amount / 100) * balance;
        const quantity = amount / currentCandle.close;
        
        // Create new position
        currentPosition = {
          entryPrice: currentCandle.close,
          entryTimestamp: currentCandle.timestamp,
          type: 'LONG',
          quantity
        };
        
        // Record the trade entry
        trades.push({
          entryTimestamp: currentCandle.timestamp,
          entryPrice: currentCandle.close,
          type: 'LONG',
          quantity,
          reason: action.reason
        });
        
      } else if (action.type === 'SELL' && currentPosition) {
        // Close the position
        const exitPrice = currentCandle.close;
        const pnl = currentPosition.type === 'LONG'
          ? (exitPrice - currentPosition.entryPrice) * currentPosition.quantity
          : (currentPosition.entryPrice - exitPrice) * currentPosition.quantity;
        
        // Update balance
        balance += pnl;
        
        // Complete the trade log
        const lastTrade = trades[trades.length - 1];
        if (lastTrade && !lastTrade.exitTimestamp) {
          lastTrade.exitTimestamp = currentCandle.timestamp;
          lastTrade.exitPrice = exitPrice;
          lastTrade.pnl = pnl;
          lastTrade.holdingPeriod = this.formatHoldingPeriod(
            currentCandle.timestamp - lastTrade.entryTimestamp
          );
          lastTrade.exitReason = 'Strategy Signal';
        }
        
        // Reset position
        currentPosition = undefined;
      }
    }

    // Step 4: Calculate final metrics
    const completedTrades = trades.filter(t => t.exitTimestamp !== undefined);
    const totalTrades = completedTrades.length;
    const winningTrades = completedTrades.filter(t => (t.pnl || 0) > 0).length;
    const losingTrades = completedTrades.filter(t => (t.pnl || 0) < 0).length;
    
    // Calculate total profit and loss amounts
    const totalProfit = completedTrades
      .filter(t => (t.pnl || 0) > 0)
      .reduce((sum, trade) => sum + (trade.pnl || 0), 0);
    
    const totalLoss = Math.abs(completedTrades
      .filter(t => (t.pnl || 0) < 0)
      .reduce((sum, trade) => sum + (trade.pnl || 0), 0));
    
    // Calculate profit factor (ratio of gross profit to gross loss)
    const profitFactor = totalLoss > 0 ? totalProfit / totalLoss : totalProfit > 0 ? Infinity : 0;
    
    // Calculate win rate based on number of winning trades
    // We can verify this by confirming winningTrades + losingTrades = totalTrades (excluding breakeven trades)
    const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;
    
    // Validate calculation consistency
    console.log(`Win/Loss Trade Count Check: ${winningTrades} + ${losingTrades} = ${winningTrades + losingTrades} (Total: ${totalTrades})`);
    console.log(`Win Rate: ${winRate.toFixed(2)}%, Profit Factor: ${profitFactor.toFixed(2)}`);
    console.log(`Total Profit: $${totalProfit.toFixed(2)}, Total Loss: $${totalLoss.toFixed(2)}`);
    

    // If there's still an open position, calculate unrealized P&L
    if (currentPosition) {
      const lastCandle = marketData[marketData.length - 1];
      const unrealizedPnl = currentPosition.type === 'LONG'
        ? (lastCandle.close - currentPosition.entryPrice) * currentPosition.quantity
        : (currentPosition.entryPrice - lastCandle.close) * currentPosition.quantity;
      
      balance += unrealizedPnl;
    }

    // Step 5: Return backtest results
    return {
      trades,
      winRate,
      totalTrades,
      finalBalance: balance,
      strategyName,
      profitFactor,
      totalProfit,
      totalLoss,
      initialBalance: request.initialBalance // Include the initial balance for accurate return calculation
    };
  }

  private async fetchMarketData(
    exchangeService: any, 
    symbol: string, 
    interval: string, 
    fromTimestamp: number, 
    toTimestamp: number
  ): Promise<CandleData[]> {
    const response = await exchangeService.getMarketData({
      symbol,
      interval,
      fromTimestamp,
      toTimestamp
    });
    
    return response.candles;
  }

  private getWeightedTradeAction(
    strategyConfigs: BacktestRequest['strategyConfigs'],
    context: StrategyContext
  ): TradeAction {
    // For single strategy, just return its action
    if (strategyConfigs.length === 1) {
      const config = strategyConfigs[0];
      // Apply strategy-specific parameters
      const contextWithParams = {
        ...context,
        parameters: config.params
      };
      return config.strategy.evaluate(contextWithParams);
    }

    // For multiple strategies, use weighted signal aggregation
    let buyScore = 0;
    let sellScore = 0;
    let totalWeight = 0;
    let combinedReason = '';

    for (const config of strategyConfigs) {
      const { strategy, weight, params } = config;
      // Apply strategy-specific parameters
      const contextWithParams = {
        ...context,
        parameters: params
      };
      
      const action = strategy.evaluate(contextWithParams);
      totalWeight += weight;
      
      if (action.type === 'BUY') {
        buyScore += weight * (action.amount / 100);
        combinedReason += `${strategy.getName()}: BUY (${weight}%), `;
      } else if (action.type === 'SELL') {
        sellScore += weight * (action.amount / 100);
        combinedReason += `${strategy.getName()}: SELL (${weight}%), `;
      } else {
        combinedReason += `${strategy.getName()}: HOLD (${weight}%), `;
      }
    }

    // Normalize scores based on total weight
    buyScore = (buyScore / totalWeight) * 100;
    sellScore = (sellScore / totalWeight) * 100;

    // Decision threshold (50% of weighted vote)
    const threshold = 0.5;
    
    if (buyScore > sellScore && buyScore > threshold * 100) {
      return { type: 'BUY', amount: buyScore, reason: `Combined signal: ${combinedReason}` };
    } else if (sellScore > buyScore && sellScore > threshold * 100) {
      return { type: 'SELL', amount: sellScore, reason: `Combined signal: ${combinedReason}` };
    } else {
      return { type: 'HOLD', amount: 0, reason: `No strong signal: ${combinedReason}` };
    }
  }

  private formatHoldingPeriod(milliseconds: number): string {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  }
}
