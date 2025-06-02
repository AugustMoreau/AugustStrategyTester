import React, { useState } from 'react';
import { BacktestResult } from '../contracts/IStrategyEngine';
import './Tooltip.css'; // need this for the question mark icons

interface ResultsDisplayProps {
  result: BacktestResult | null;
  isLoading: boolean;
}

const ResultsDisplay: React.FC<ResultsDisplayProps> = ({ result, isLoading }) => {
  // for pagination
  const [currentPage, setCurrentPage] = useState(0);
  const tradesPerPage = 10; // maybe make this configurable later?
  
  // get the trades for current page
  const paginatedTrades = result?.trades 
    ? result.trades.slice(currentPage * tradesPerPage, (currentPage + 1) * tradesPerPage) 
    : [];
  const totalPages = result?.trades 
    ? Math.ceil(result.trades.length / tradesPerPage) 
    : 0;
  if (isLoading) {
    return (
      <div className="results-display loading">
        <div className="loading-spinner"></div>
        <p>Running backtest. Please wait...</p>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="results-display empty">
        <p>Configure your strategy and run a backtest to see results here.</p>
      </div>
    );
  }

  // count winning trades
  const profitableTrades = result.trades.filter(t => (t.pnl || 0) > 0).length;
  
  // figure out initial balance
  const initialBalance = result.initialBalance || 10000; // default 10k
  
  // calc % return
  const percentReturn = ((result.finalBalance - initialBalance) / initialBalance) * 100;
  
  // total wins/losses
  let totalWinAmount = 0;
  if (result.totalProfit) {
    totalWinAmount = result.totalProfit;
  } else {
    totalWinAmount = result.trades
      .filter(t => (t.pnl || 0) > 0)
      .reduce((sum, trade) => sum + (trade.pnl || 0), 0);
  }
    
  // same for losses
  const totalLossAmount = result.totalLoss ? -result.totalLoss : result.trades
    .filter(t => (t.pnl || 0) < 0)
    .reduce((sum, trade) => sum + (trade.pnl || 0), 0);
  
  // biggest win/loss for stats
  const completedTrades = result.trades.filter(t => t.exitTimestamp !== undefined);
  let largestWin = 0;
  let largestLoss = 0;
  
  if (completedTrades.length > 0) {
    largestWin = Math.max(...completedTrades.map(t => t.pnl || 0));
    largestLoss = Math.min(...completedTrades.map(t => t.pnl || 0));
  }

  return (
    <div className="results-display" style={{ backgroundColor: 'var(--panel-background)', padding: '20px', borderRadius: '8px', boxShadow: 'var(--shadow)', color: 'var(--text-color)', fontFamily: 'var(--font-main)' }}>
      <h2 style={{ color: 'var(--primary-color)', borderBottom: '2px solid var(--primary-color)', paddingBottom: '10px', marginBottom: '20px' }}>Backtest Results</h2>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '15px', marginBottom: '25px' }}>
        <div style={{ backgroundColor: 'var(--primary-color)', color: 'white', padding: '15px', borderRadius: '8px', boxShadow: 'var(--shadow)' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '500', marginBottom: '10px' }}>Win Rate</h3>
          <div style={{ fontSize: '28px', fontWeight: '700' }}>{result.winRate.toFixed(2)}%</div>
        </div>
        
        <div style={{ backgroundColor: 'var(--primary-color)', color: 'white', padding: '15px', borderRadius: '8px', boxShadow: 'var(--shadow)' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '500', marginBottom: '10px' }}>Total Trades</h3>
          <div style={{ fontSize: '28px', fontWeight: '700' }}>{result.totalTrades}</div>
        </div>
        
        <div style={{ backgroundColor: 'var(--card-background)', color: 'var(--text-color)', padding: '15px', borderRadius: '8px', boxShadow: 'var(--shadow)', border: '1px solid var(--border-color)' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '500', marginBottom: '10px' }}>Final Balance</h3>
          <div style={{ fontSize: '28px', fontWeight: '700' }}>${result.finalBalance.toFixed(2)}</div>
        </div>
        
        <div style={{ backgroundColor: 'var(--card-background)', color: 'var(--text-color)', padding: '15px', borderRadius: '8px', boxShadow: 'var(--shadow)', border: '1px solid var(--border-color)' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '500', marginBottom: '10px' }}>Return</h3>
          <div style={{ fontSize: '28px', fontWeight: '700', color: percentReturn >= 0 ? '#2E7D32' : '#C62828' }}>
            {percentReturn.toFixed(2)}%
          </div>
        </div>

        <div style={{ backgroundColor: 'var(--card-background)', color: 'var(--text-color)', padding: '15px', borderRadius: '8px', boxShadow: 'var(--shadow)', border: '1px solid var(--border-color)' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '500', marginBottom: '10px' }}>Total Win</h3>
          <div style={{ fontSize: '28px', fontWeight: '700', color: '#2E7D32' }}>
            ${totalWinAmount.toFixed(2)}
          </div>
        </div>
        
        <div style={{ backgroundColor: 'var(--card-background)', color: 'var(--text-color)', padding: '15px', borderRadius: '8px', boxShadow: 'var(--shadow)', border: '1px solid var(--border-color)' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '500', marginBottom: '10px' }}>Total Loss</h3>
          <div style={{ fontSize: '28px', fontWeight: '700', color: '#C62828' }}>
            ${Math.abs(totalLossAmount).toFixed(2)}
          </div>
        </div>
      </div>
      
      <div style={{ backgroundColor: 'var(--card-background)', padding: '15px', borderRadius: '8px', boxShadow: 'var(--shadow)', border: '1px solid var(--border-color)', marginBottom: '20px' }}>
        <h3 style={{ fontSize: '18px', color: 'var(--primary-color)', fontWeight: '600', marginBottom: '0' }}>Strategy: {result.strategyName}</h3>
      </div>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '15px', marginBottom: '25px', backgroundColor: 'var(--card-background)', padding: '15px', borderRadius: '8px', boxShadow: 'var(--shadow)', border: '1px solid var(--border-color)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', padding: '8px 0' }}>
          <span style={{ fontWeight: '500', color: 'var(--text-color)' }}>Winning Trades:</span>
          <span style={{ fontWeight: '600', color: 'var(--text-color)' }}>{profitableTrades}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', padding: '8px 0' }}>
          <span style={{ fontWeight: '500', color: 'var(--text-color)' }}>Losing Trades:</span>
          <span style={{ fontWeight: '600', color: 'var(--text-color)' }}>{result.totalTrades - profitableTrades}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', padding: '8px 0' }}>
          <span style={{ fontWeight: '500', color: '#e0e0e0', display: 'flex', alignItems: 'center' }}>
            Profit Factor:
            <div className="tooltip-container" style={{ marginLeft: '5px' }}>
              <span className="tooltip-icon">?</span>
              <div className="tooltip-text">
                Profit Factor = gross profits / gross losses. Above 1 is good.
              </div>
            </div>
          </span>
          <span style={{ fontWeight: '600', color: result.profitFactor && result.profitFactor > 1 ? 'var(--profit-color)' : 'var(--loss-color)' }}>
            {result.profitFactor ? result.profitFactor.toFixed(2) : 'N/A'}
          </span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', padding: '8px 0' }}>
          <span style={{ fontWeight: '500', color: 'var(--text-color)' }}>Largest Win:</span>
          <span style={{ fontWeight: '600', color: 'var(--profit-color)' }}>${largestWin.toFixed(2)}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0' }}>
          <span style={{ fontWeight: '500', color: 'var(--text-color)' }}>Largest Loss:</span>
          <span style={{ fontWeight: '600', color: 'var(--loss-color)' }}>${Math.abs(largestLoss).toFixed(2)}</span>
        </div>
      </div>
      
      <h3 style={{ color: 'var(--primary-color)', marginTop: '25px', marginBottom: '15px', fontWeight: '600' }}>Trade History</h3>
      <div style={{ backgroundColor: 'var(--card-background)', padding: '15px', borderRadius: '8px', boxShadow: 'var(--shadow)', overflowX: 'auto', border: '1px solid var(--border-color)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px', color: 'var(--text-color)' }}>
          <thead style={{ backgroundColor: 'var(--panel-header)', borderBottom: '2px solid var(--border-color)' }}>
            <tr>
              <th style={{ padding: '12px 15px', textAlign: 'left', fontWeight: '600', color: 'var(--text-color)' }}>Entry Date</th>
              <th style={{ padding: '12px 15px', textAlign: 'left', fontWeight: '600', color: 'var(--text-color)' }}>Exit Date</th>
              <th style={{ padding: '12px 15px', textAlign: 'left', fontWeight: '600', color: 'var(--text-color)' }}>Entry Price</th>
              <th style={{ padding: '12px 15px', textAlign: 'left', fontWeight: '600', color: 'var(--text-color)' }}>Exit Price</th>
              <th style={{ padding: '12px 15px', textAlign: 'left', fontWeight: '600', color: 'var(--text-color)' }}>Type</th>
              <th style={{ padding: '12px 15px', textAlign: 'left', fontWeight: '600', color: 'var(--text-color)' }}>P&L</th>
              <th style={{ padding: '12px 15px', textAlign: 'left', fontWeight: '600', color: 'var(--text-color)' }}>Duration</th>
              <th style={{ padding: '12px 15px', textAlign: 'left', fontWeight: '600', color: 'var(--text-color)' }}>Exit Reason</th>
            </tr>
          </thead>
          <tbody>
            {paginatedTrades.map((trade, index) => (
              <tr key={index} style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-color)' }}>
                <td style={{ padding: '10px 15px' }}>{formatDate(trade.entryTimestamp)}</td>
                <td style={{ padding: '10px 15px' }}>{trade.exitTimestamp ? formatDate(trade.exitTimestamp) : 'Open'}</td>
                <td style={{ padding: '10px 15px' }}>${trade.entryPrice.toFixed(2)}</td>
                <td style={{ padding: '10px 15px' }}>{trade.exitPrice ? `$${trade.exitPrice.toFixed(2)}` : '-'}</td>
                <td style={{ padding: '10px 15px' }}>{trade.type}</td>
                <td style={{ padding: '10px 15px', fontWeight: '600', color: trade.pnl && trade.pnl > 0 ? 'var(--profit-color)' : 'var(--loss-color)' }}>
                  {trade.pnl ? `$${trade.pnl.toFixed(2)}` : '-'}
                </td>
                <td style={{ padding: '10px 15px' }}>{trade.holdingPeriod || '-'}</td>
                <td style={{ padding: '10px 15px' }}>{trade.exitReason || '-'}</td>

              </tr>
            ))}
          </tbody>
        </table>
        
        {/* pagination buttons */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px', padding: '10px 0' }}>
            <button 
              onClick={() => setCurrentPage(prev => Math.max(0, prev - 1))} 
              disabled={currentPage === 0}
              style={{ 
                padding: '8px 16px', 
                backgroundColor: currentPage === 0 ? 'var(--panel-header)' : 'var(--primary-color)', 
                color: currentPage === 0 ? '#999' : 'white', 
                border: 'none', 
                borderRadius: '4px', 
                cursor: currentPage === 0 ? 'not-allowed' : 'pointer' 
              }}
            >
              Previous
            </button>
            <span style={{ color: 'var(--light-text)', fontWeight: '500' }}>
              Page {currentPage + 1} of {totalPages} 
              ({result.trades.length} total trades)
            </span>
            <button 
              onClick={() => setCurrentPage(prev => Math.min(totalPages - 1, prev + 1))} 
              disabled={currentPage >= totalPages - 1}
              style={{ 
                padding: '8px 16px', 
                backgroundColor: currentPage >= totalPages - 1 ? 'var(--panel-header)' : 'var(--primary-color)', 
                color: currentPage >= totalPages - 1 ? '#999' : 'white', 
                border: 'none', 
                borderRadius: '4px', 
                cursor: currentPage >= totalPages - 1 ? 'not-allowed' : 'pointer' 
              }}
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// formats timestamp to readable date
function formatDate(timestamp: number): string {
  // could use moment.js but this is simpler
  const date = new Date(timestamp);
  return date.toLocaleString();
}



export default ResultsDisplay;
