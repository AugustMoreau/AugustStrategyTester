import React, { useState, useEffect } from 'react';
import ConfigPanel, { BacktestConfig } from './components/ConfigPanel';
import ResultsDisplay from './components/ResultsDisplay';
import { StrategyEngine } from './services/StrategyEngine';
import { HistoricalDataService } from './services/HistoricalDataService';
import { BacktestResult } from './contracts/IStrategyEngine';
import './App.css';

const App: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<BacktestResult | null>(null);
  const [darkMode, setDarkMode] = useState(false);
  
  // toggle dark mode by adding/removing class
  useEffect(() => {
    // this feels like a hack but it works well enough
    document.body.classList.toggle('dark-theme', darkMode);
  }, [darkMode]);

  const handleRunBacktest = async (config: BacktestConfig) => {
    // reset state before running
    setIsLoading(true);
    setResult(null);

    try {
      const exchangeService = new HistoricalDataService();
      const strategyEngine = new StrategyEngine();
      
      // JS Date objects -> timestamps
      const fromTimestamp = config.fromDate.getTime();
      const toTimestamp = config.toDate.getTime();
      
      // TODO: move this to a worker thread?
      const result = await strategyEngine.runBacktest({
        strategyConfigs: config.strategyConfigs,
        exchangeService,
        symbol: config.symbol,
        interval: config.interval,
        initialBalance: config.initialBalance,
        fromTimestamp,
        toTimestamp,
        takeProfitRatio: config.takeProfitRatio
      });
      
      setResult(result);
    } catch (error) {
      console.error('Error running backtest:', error);
      alert(`Error running backtest: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      // always turn off loading indicator
      setIsLoading(false);
    }
  };

  // icons for theme switcher
  // grabbed these from heroicons - might replace with better ones later
  const MoonIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
      <path d="M12 3a9 9 0 1 0 9 9c0-.46-.04-.92-.1-1.36a5.389 5.389 0 0 1-4.4 2.26 5.403 5.403 0 0 1-3.14-9.8c-.44-.06-.9-.1-1.36-.1z"/>
    </svg>
  );
  
  const SunIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
      <path d="M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10zm0 12a1 1 0 0 0 1-1v-1a1 1 0 0 0-2 0v1a1 1 0 0 0 1 1zm6.36-2.05a1 1 0 0 0 .71-1.71l-.7-.7a1 1 0 1 0-1.42 1.42l.7.7a1 1 0 0 0 .71.29zM21 12a1 1 0 0 0-1-1h-1a1 1 0 0 0 0 2h1a1 1 0 0 0 1-1zm-3.93-6.66a1 1 0 0 0 .71.29 1 1 0 0 0 .71-.29 1 1 0 0 0 0-1.42l-.71-.7a1 1 0 0 0-1.42 1.42l.71.7zm-2.43-.29a1 1 0 0 0 1-1V3a1 1 0 0 0-2 0v1.05a1 1 0 0 0 1 1zM4 12a1 1 0 0 0 1 1h1a1 1 0 0 0 0-2H5a1 1 0 0 0-1 1zm3.93 6.66a1 1 0 1 0 1.42-1.42l-.71-.7a1 1 0 0 0-1.42 1.41l.71.71zm6.43.29a1 1 0 0 0-1 1V21a1 1 0 0 0 2 0v-1.05a1 1 0 0 0-1-1zm-9.65-2.05a1 1 0 0 0 .71-.29l.7-.7a1 1 0 0 0-1.41-1.42l-.7.71a1 1 0 0 0 0 1.41 1 1 0 0 0 .7.29z"/>
    </svg>
  );

  return (
    <div className="app">
      {/* theme toggle button */}
      <button 
        className="theme-toggle" 
        onClick={() => setDarkMode(!darkMode)}
        aria-label="Toggle dark mode"
      >
        {darkMode ? <SunIcon /> : <MoonIcon />}
      </button>
      <header className="app-header">
        <h1 className="logo-text">August Strategy Tester</h1>
        <p>Backtest cryptocurrency trading strategies with historical data</p>
      </header>
      
      <main className="app-content">
        <div className="config-section">
          <ConfigPanel 
            onRunBacktest={handleRunBacktest}
            isLoading={isLoading}
          />
        </div>
        
        <div className="results-section">
          <ResultsDisplay 
            result={result}
            isLoading={isLoading}
          />
        </div>
      </main>
      
      {/* simple footer */}
      <footer className="app-footer">
        <p>August Strategy Tester &copy; 2025</p>
      </footer>
    </div>
  );
};

export default App;
