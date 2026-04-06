import type { Signal, TradingSymbol } from "../core/types.js";

export interface BacktestConfig {
  symbol: TradingSymbol;
  /** Total candles to generate (must be > windowSize + 1). */
  totalCandles: number;
  /** Sliding window fed to the technical analysis agent. */
  windowSize: number;
  startingCapital: number;
  /** Fraction of capital per trade, e.g. 0.10 = 10%. */
  positionSizePct: number;
  stopLossPct: number;
  takeProfitPct: number;
}

export type ExitReason = "SIGNAL" | "STOP_LOSS" | "TAKE_PROFIT" | "END_OF_DATA";

export interface BacktestTrade {
  entryDay: number;
  exitDay: number;
  entryPrice: number;
  exitPrice: number;
  quantity: number;
  signal: Signal;
  pnl: number;
  pnlPct: number;
  exitReason: ExitReason;
}

export interface DailySnapshot {
  day: number;
  price: number;
  signal: Signal;
  equity: number;
  inPosition: boolean;
}

export interface PerformanceMetrics {
  startingCapital: number;
  finalCapital: number;
  totalReturnPct: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRatePct: number;
  avgPnlPct: number;
  bestTradePct: number;
  worstTradePct: number;
  maxDrawdownPct: number;
  sharpeRatio: number;
  totalDays: number;
}

export interface BacktestResult {
  config: BacktestConfig;
  trades: BacktestTrade[];
  equityCurve: DailySnapshot[];
  metrics: PerformanceMetrics;
}
