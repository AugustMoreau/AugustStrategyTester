import React, { useState } from 'react';
import "./Tooltip.css";

// quick tooltip for param help
interface TooltipProps {
  text: string;
}

const Tooltip: React.FC<TooltipProps> = ({ text }) => {
  return (
    <span className="tooltip-container">
      <span className="tooltip-icon">?</span>
      <span className="tooltip-text">{text}</span>
    </span>
  );
};

import { availableStrategies } from '../strategies';
import { ITradingStrategy, ParamDefinition } from '../contracts/ITradingStrategy';
import { StrategyConfig } from '../contracts/IStrategyEngine';

interface ConfigPanelProps {
  onRunBacktest: (config: BacktestConfig) => void;
  isLoading: boolean;
}

export interface BacktestConfig {
  symbol: string;
  interval: string;
  initialBalance: number;
  fromDate: Date;
  toDate: Date;
  strategyConfigs: StrategyConfig[];
  takeProfitRatio: number; // Take profit ratio (1:X)
}

const ConfigPanel: React.FC<ConfigPanelProps> = ({ onRunBacktest, isLoading }) => {
  const [symbol, setSymbol] = useState('BTCUSDT');
  const [interval, setInterval] = useState('1h');
  const [initialBalance, setInitialBalance] = useState(10000);
  // default to last 30 days
  const [fromDate, setFromDate] = useState(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));
  const [toDate, setToDate] = useState(new Date());
  // cap dates at June 2025 when we run out of data
  const maxAllowedDate = new Date(2025, 5, 1); // 5 = June (zero-indexed months)
  const [mode, setMode] = useState<'single' | 'combined'>('single');
  const [selectedStrategy, setSelectedStrategy] = useState<ITradingStrategy>(availableStrategies[0]);
  const [selectedStrategies, setSelectedStrategies] = useState<{ strategy: ITradingStrategy; weight: number }[]>([]);
  const [strategyParams, setStrategyParams] = useState<Record<string, Record<string, any>>>({});
  const [takeProfitRatio, setTakeProfitRatio] = useState<number>(1); // Default 1:1 ratio
  const [strategyToAdd, setStrategyToAdd] = useState<string>("");
  // using CSS tooltips now - way simpler than the old JS version

  // load default params when strategy changes
  React.useEffect(() => {
    if (!selectedStrategy) return;
    
    // grab defaults from strategy definition
    let params: Record<string, any> = {};
    for (const param of selectedStrategy.getParamDefinitions()) {
      params[param.name] = param.defaultValue;
    }

    setStrategyParams(prev => ({
      ...prev,
      [selectedStrategy.getName()]: params
    }));
  }, [selectedStrategy]);

  const handleAddStrategy = () => {
    if (!strategyToAdd) return;
    
    // Find the strategy object by name
    const strategyToAddObj = availableStrategies.find(s => s.getName() === strategyToAdd);
    if (!strategyToAddObj) return;
    
    // Only add if not already in the list
    if (!selectedStrategies.find(s => s.strategy.getName() === strategyToAdd)) {
      // Initialize parameters for this strategy if not already done
      if (!strategyParams[strategyToAdd]) {
        const params = strategyToAddObj.getParamDefinitions().reduce((acc, param) => {
          acc[param.name] = param.defaultValue;
          return acc;
        }, {} as Record<string, any>);

        setStrategyParams(prev => ({
          ...prev,
          [strategyToAdd]: params
        }));
      }

      // Add strategy with equal weight distribution
      const newStrategy = { strategy: strategyToAddObj, weight: 100 / (selectedStrategies.length + 1) };
      const updatedStrategies = [...selectedStrategies, newStrategy];
      
      // Recalculate weights to sum to 100%
      const equalWeight = 100 / updatedStrategies.length;
      const normalizedStrategies = updatedStrategies.map(s => ({ ...s, weight: equalWeight }));
      
      setSelectedStrategies(normalizedStrategies);
      setStrategyToAdd(""); // Clear the selection after adding
    }
  };
  
  const handleClearStrategies = () => {
    setSelectedStrategies([]);
  };

  const handleRemoveStrategy = (strategyName: string) => {
    const newStrategies = selectedStrategies.filter(s => s.strategy.getName() !== strategyName);
    setSelectedStrategies(newStrategies);
    
    // Recalculate weights
    if (newStrategies.length > 0) {
      const equalWeight = 100 / newStrategies.length;
      const updatedStrategies = newStrategies.map(s => ({ ...s, weight: equalWeight }));
      setSelectedStrategies(updatedStrategies);
    }
  };

  const handleWeightChange = (strategyName: string, weight: number) => {
    // Update the weight for the specified strategy
    const updatedStrategies = selectedStrategies.map(s => 
      s.strategy.getName() === strategyName ? { ...s, weight } : s
    );
    
    // Calculate total weight
    const totalWeight = updatedStrategies.reduce((sum, s) => sum + s.weight, 0);
    
    // Normalize weights to sum to 100%
    if (totalWeight > 0) {
      const normalizedStrategies = updatedStrategies.map(s => ({
        ...s,
        weight: (s.weight / totalWeight) * 100
      }));
      setSelectedStrategies(normalizedStrategies);
    } else {
      setSelectedStrategies(updatedStrategies);
    }
  };

  const handleParamChange = (strategyName: string, paramName: string, value: any) => {
    setStrategyParams(prev => ({
      ...prev,
      [strategyName]: {
        ...prev[strategyName],
        [paramName]: value
      }
    }));
  };

  // limits based on binance api restrictions
  const getMaxDateRange = (interval: string): number => {
    const DAY = 24 * 60 * 60 * 1000;
    const YEAR = 365 * DAY;
    
    // different timeframes have different max lookback periods
    switch(interval) {
      case '1m': return 7 * DAY;    // 1min candles = 7 days max
      case '5m': return 30 * DAY;   // 5min = 30d
      case '15m': return 90 * DAY;  // 15min = 90d
      case '1h': return YEAR;       // 1h = 1y
      case '4h': return 2 * YEAR;   // 4h = 2y
      case '1d': return 3 * YEAR;   // 1d = 3y
      default: return 30 * DAY;     // fallback
    }
  };

  // Adjust fromDate when interval changes
  React.useEffect(() => {
    const maxRange = getMaxDateRange(interval);
    const minAllowedDate = new Date(Date.now() - maxRange);
    
    // If current fromDate is before the minimum allowed date, update it
    if (fromDate < minAllowedDate) {
      setFromDate(minAllowedDate);
    }
    
    // Also ensure toDate is within allowed range if needed
    const currentDate = new Date();
    if (toDate > currentDate) {
      setToDate(currentDate);
    }
  }, [interval]);

  const getMinDateForInterval = (): string => {
    const maxRange = getMaxDateRange(interval);
    const minAllowedDate = new Date(Date.now() - maxRange);
    return minAllowedDate.toISOString().split('T')[0];
  };

  // submit form when run button is clicked
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleRunBacktest();
  };
  
  const handleRunBacktest = () => {
    // basic validation
    if (fromDate >= toDate) {
      alert('Start date must be before end date');
      return;
    }

    // check date range limits
    const maxRange = getMaxDateRange(interval);
    const rangeDays = Math.floor(maxRange / (24 * 60 * 60 * 1000));
    if (toDate.getTime() - fromDate.getTime() > maxRange) {
      alert(`${interval} interval is limited to ${rangeDays} days of data`);
      return;
    }
    
    // prepare strategy configs
    let strategyConfigs: StrategyConfig[] = [];
    
    if (mode === 'single') {
      strategyConfigs = [{
        strategy: selectedStrategy,
        params: strategyParams[selectedStrategy.getName()] || {},
        weight: 1
      }];
    } else {
      // multi-strategy mode 
      strategyConfigs = selectedStrategies.map(({ strategy, weight }) => ({
        strategy: strategy,
        params: strategyParams[strategy.getName()] || {},
        weight: weight / 100 // percentage -> decimal
      }));
    }
    
    // build the complete config
    const config: BacktestConfig = {
      symbol,
      interval,
      initialBalance,
      fromDate,
      toDate,
      strategyConfigs,
      takeProfitRatio
    };

    onRunBacktest(config);
  };

  const renderParamInputs = (strategy: ITradingStrategy) => {
    return (
      <div className="strategy-params">
        <h4>{strategy.getName()} Parameters</h4>
        {strategy.getParamDefinitions().map(param => renderParamInput(strategy.getName(), param))}
      </div>
    );
  };

  const renderParamInput = (strategyName: string, param: ParamDefinition) => {
    const value = strategyParams[strategyName]?.[param.name] ?? param.defaultValue;
    
    switch (param.type) {
      case 'number':
        return (
          <div key={param.name} className="param-input">
            <div className="label-with-tooltip">
              <label htmlFor={`${strategyName}-${param.name}`}>{param.label}</label>
              <div className="tooltip">
                <span className="tooltip-icon">?</span>
                <span className="tooltip-text">{param.description || `Parameter for ${param.label}`}</span>
              </div>
            </div>
            <div className="number-input-container">
              <input
                id={`${strategyName}-${param.name}`}
                type="number"
                min={param.min}
                max={param.max}
                step={param.step}
                value={value}
                onChange={e => handleParamChange(strategyName, param.name, parseFloat(e.target.value))}
              />
              <div className="spinner-buttons">
                <button 
                  type="button" 
                  className="spinner-button spinner-up"
                  onClick={() => {
                    const newValue = Math.min((value || 0) + (param.step || 1), param.max || Infinity);
                    handleParamChange(strategyName, param.name, newValue);
                  }}
                  aria-label="Increase value"
                ></button>
                <button 
                  type="button" 
                  className="spinner-button spinner-down"
                  onClick={() => {
                    const newValue = Math.max((value || 0) - (param.step || 1), param.min || -Infinity);
                    handleParamChange(strategyName, param.name, newValue);
                  }}
                  aria-label="Decrease value"
                ></button>
              </div>
            </div>
          </div>
        );
      case 'select':
        return (
          <div key={param.name} className="param-input">
            <div className="label-with-tooltip">
              <label htmlFor={`${strategyName}-${param.name}`}>{param.label}</label>
              <div className="tooltip">
                <span className="tooltip-icon">?</span>
                <span className="tooltip-text">{param.description || `Parameter for ${param.label}`}</span>
              </div>
            </div>
            <select
              id={`${strategyName}-${param.name}`}
              value={value}
              onChange={e => handleParamChange(strategyName, param.name, e.target.value)}
            >
              {param.options?.map(option => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </div>
        );
      case 'boolean':
        return (
          <div key={param.name} className="param-input checkbox">
            <div className="label-with-tooltip">
              <label htmlFor={`${strategyName}-${param.name}`}>
                <input
                  id={`${strategyName}-${param.name}`}
                  type="checkbox"
                  checked={value}
                  onChange={e => handleParamChange(strategyName, param.name, e.target.checked)}
                />
                {param.label}
              </label>
              {param.description && <Tooltip text={param.description} />}
            </div>
          </div>
        );
      default:
        return (
          <div key={param.name} className="param-input">
            <div className="label-with-tooltip">
              <label htmlFor={`${strategyName}-${param.name}`}>{param.label}</label>
              <div className="tooltip">
                <span className="tooltip-icon">?</span>
                <span className="tooltip-text">{param.description || `Parameter for ${param.label}`}</span>
              </div>
            </div>
            <input
              id={`${strategyName}-${param.name}`}
              type="text"
              value={value}
              onChange={e => handleParamChange(strategyName, param.name, e.target.value)}
            />
          </div>
        );
    }
  };

  return (
    <div className="config-panel">
      <h2>Strategy Settings</h2>
      <form onSubmit={handleSubmit}>
      
      <div className="form-group">
        <label htmlFor="symbol">Cryptocurrency</label>
        <select
          id="symbol"
          value={symbol}
          onChange={e => setSymbol(e.target.value)}
        >
          <option value="BTCUSDT">Bitcoin (BTC)</option>
          <option value="ETHUSDT">Ethereum (ETH)</option>
          <option value="SOLUSDT">Solana (SOL)</option>
          <option value="XRPUSDT">Ripple (XRP)</option>
        </select>
      </div>
      
      <div className="form-group">
        <label htmlFor="interval">Timeframe</label>
        <select
          id="interval"
          value={interval}
          onChange={e => setInterval(e.target.value)}
        >
          <option value="1m">1 minute</option>
          <option value="5m">5 minutes</option>
          <option value="15m">15 minutes</option>
          <option value="1h">1 hour</option>
          <option value="4h">4 hours</option>
          <option value="1d">1 day</option>
        </select>
      </div>
      
      <div className="form-group">
        <label htmlFor="initialBalance">Initial Balance (USDT)</label>
        <input
          id="initialBalance"
          type="number"
          min="100"
          step="100"
          value={initialBalance}
          onChange={e => setInitialBalance(parseFloat(e.target.value))}
        />
      </div>
      
      <div className="date-range">
        <div className="form-group">
          <label htmlFor="fromDate">From Date</label>
          <input
            id="fromDate"
            type="date"
            min={getMinDateForInterval()}
            max={toDate.toISOString().split('T')[0]}
            value={fromDate.toISOString().split('T')[0]}
            onChange={e => {
              const newDate = new Date(e.target.value);
              const minDate = new Date(getMinDateForInterval());
              // Enforce minimum date restriction
              if (newDate < minDate) {
                setFromDate(minDate);
              } else {
                setFromDate(newDate);
              }
            }}
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="toDate">To Date</label>
          <input
            id="toDate"
            type="date"
            min={fromDate.toISOString().split('T')[0]}
            max={maxAllowedDate.toISOString().split('T')[0]}
            value={toDate.toISOString().split('T')[0]}
            onChange={e => {
              const newDate = new Date(e.target.value);
              
              // Ensure date is not beyond maximum allowed date
              if (newDate > maxAllowedDate) {
                setToDate(maxAllowedDate);
              } else {
                setToDate(newDate);
              }
            }}
          />
        </div>
      </div>
      
      <div className="strategy-mode">
        <div className="form-group">
          <label>Strategy Mode</label>
          <div className="radio-group">
            <label className="radio-label">
              <input
                type="radio"
                value="single"
                checked={mode === 'single'}
                onChange={() => setMode('single')}
              />
              Single Strategy
            </label>
            <label className="radio-label">
              <input
                type="radio"
                value="combined"
                checked={mode === 'combined'}
                onChange={() => setMode('combined')}
              />
              Combined Strategies
            </label>
          </div>
        </div>
      </div>
      
      {mode === 'single' ? (
        <div className="single-strategy">
          <div className="form-group">
            <label htmlFor="strategy">Strategy</label>
            <select
              id="strategy"
              value={selectedStrategy.getName()}
              onChange={e => {
                const strategy = availableStrategies.find(s => s.getName() === e.target.value);
                if (strategy) setSelectedStrategy(strategy);
              }}
            >
              {availableStrategies.map(strategy => (
                <option key={strategy.getName()} value={strategy.getName()}>
                  {strategy.getName()}
                </option>
              ))}
            </select>
          </div>
          
          <div className="strategy-description">
            {selectedStrategy.getDescription()}
          </div>
          
          {renderParamInputs(selectedStrategy)}
        </div>
      ) : (
        <div className="combined-strategies">


          <div className="strategy-selector">
            <div className="form-group">
              <label htmlFor="add-strategy">Add Strategy</label>
              <div className="selector-controls">
                <select 
                  id="add-strategy"
                  value={strategyToAdd} 
                  onChange={e => setStrategyToAdd(e.target.value)}
                  aria-label="Select strategy to add"
                >
                  <option value="">Select a strategy...</option>
                  {availableStrategies
                    .filter(s => !selectedStrategies.some(selected => selected.strategy.getName() === s.getName()))
                    .map(s => (
                      <option key={s.getName()} value={s.getName()}>
                        {s.getName()}
                      </option>
                    ))}
                </select>
                <button 
                  type="button" 
                  className="add-strategy-btn"
                  onClick={handleAddStrategy}
                  disabled={!strategyToAdd}
                  aria-label="Add selected strategy"
                >
                  Add
                </button>
                <button 
                  type="button" 
                  className="clear-strategies-btn"
                  onClick={handleClearStrategies}
                  disabled={selectedStrategies.length === 0}
                >
                  Clear All
                </button>
              </div>
            </div>
          </div>
          
          {selectedStrategies.length === 0 ? (
            <div className="no-strategies">Add at least one strategy</div>
          ) : (
            <div className="strategy-list">
              {selectedStrategies.map(({ strategy, weight }) => (
                <div key={strategy.getName()} className="strategy-card">
                  <div className="strategy-card-header">
                    <h4>{strategy.getName()}</h4>
                    <div className="strategy-description">
                      {strategy.getDescription()}
                    </div>
                    <div className="strategy-actions">
                      <button 
                        className="remove-strategy-btn"
                        onClick={() => handleRemoveStrategy(strategy.getName())}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                  
                  <div className="strategy-card-content">
                    <div className="form-group weight-control">
                      <label htmlFor={`weight-${strategy.getName()}`}>
                        Strategy Weight
                      </label>
                      <div className="range-with-value">
                        <input
                          id={`weight-${strategy.getName()}`}
                          type="range"
                          min="1"
                          max="100"
                          value={weight}
                          onChange={e => handleWeightChange(strategy.getName(), parseFloat(e.target.value))}
                          aria-label={`Adjust weight for ${strategy.getName()}`}
                        />
                        <span className="range-value">{weight.toFixed(1)}%</span>
                      </div>

                    </div>
                    
                    <div className="strategy-params">
                      <h5>Parameters</h5>
                      {strategy.getParamDefinitions()
                        .filter(param => param.name !== 'tradeAmount') // Skip trade amount for combined strategies
                        .map(param => renderParamInput(strategy.getName(), param))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      
      <div className="run-backtest">
        {/* Risk Management Options */}
        <div className="form-section">
          <h3>Risk Management</h3>
          
          <div className="form-group">
            <label htmlFor="takeProfitRatio">Stop Loss : Take Profit Ratio</label>
            <div className="range-with-value">
              <input 
                type="range" 
                id="takeProfitRatio" 
                min="1" 
                max="10" 
                step="1" 
                value={takeProfitRatio} 
                onChange={(e) => setTakeProfitRatio(parseInt(e.target.value))} 
              />
              <span className="range-value">1:{takeProfitRatio}</span>
            </div>
          </div>
        </div>
        
        {/* Run button */}
        <div className="form-group run-backtest" style={{ marginTop: '25px', textAlign: 'center' }}>
          <button 
            onClick={handleRunBacktest} 
            disabled={isLoading}
            style={{ 
              backgroundColor: '#1976D2', 
              color: 'white', 
              padding: '12px 30px', 
              fontSize: '18px', 
              fontWeight: '600', 
              border: 'none', 
              borderRadius: '8px', 
              cursor: isLoading ? 'not-allowed' : 'pointer',
              boxShadow: '0 4px 6px rgba(0,0,0,0.1)', 
              transition: 'all 0.2s ease', 
              width: '100%',
              maxWidth: '400px'
            }}
            onMouseOver={(e) => {
              if (!isLoading) {
                e.currentTarget.style.backgroundColor = '#1565C0';
                e.currentTarget.style.boxShadow = '0 6px 8px rgba(0,0,0,0.15)';
              }
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = '#1976D2';
              e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)';
            }}
          >
            {isLoading ? 'Running...' : 'Run Backtest'}
          </button>
        </div>
      </div>
      </form>
    </div>
  );
};

export default ConfigPanel;
