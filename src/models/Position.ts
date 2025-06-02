export interface Position {
  entryPrice: number;
  entryTimestamp: number;
  type: 'LONG' | 'SHORT';
  quantity: number;
}
