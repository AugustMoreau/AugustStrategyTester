import { ITradingStrategy } from '../contracts/ITradingStrategy';
import { MACrossoverStrategy } from './MACrossoverStrategy';
import { RSIStrategy } from './RSIStrategy';
import { MACDStrategy } from './MACDStrategy';
import { BollingerBandsStrategy } from './BollingerBandsStrategy';
import { StochasticStrategy } from './StochasticStrategy';
import { IchimokuStrategy } from './IchimokuStrategy';
import { ParabolicSARStrategy } from './ParabolicSARStrategy';
import { VWAPStrategy } from './VWAPStrategy';

// Register all available strategies here
export const availableStrategies: ITradingStrategy[] = [
  new MACrossoverStrategy(),
  new RSIStrategy(),
  new MACDStrategy(),
  new BollingerBandsStrategy(),
  new StochasticStrategy(),
  new IchimokuStrategy(),
  new ParabolicSARStrategy(),
  new VWAPStrategy()
];

// Helper function to get strategy by name
export function getStrategyByName(name: string): ITradingStrategy | undefined {
  return availableStrategies.find(strategy => strategy.getName() === name);
}
