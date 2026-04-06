// ─── Enums ────────────────────────────────────────────────────────────────────

export enum Market {
  BYMA   = "BYMA",
  CEDEAR = "CEDEAR",
}

export enum Signal {
  BUY  = "BUY",
  SELL = "SELL",
  HOLD = "HOLD",
}

export enum Trend {
  BULLISH = "BULLISH",
  BEARISH = "BEARISH",
  NEUTRAL = "NEUTRAL",
}

export enum Sentiment {
  POSITIVE = "POSITIVE",
  NEGATIVE = "NEGATIVE",
  NEUTRAL  = "NEUTRAL",
}

export enum DecisionReason {
  TECHNICAL_SIGNAL  = "TECHNICAL_SIGNAL",
  NEWS_CATALYST     = "NEWS_CATALYST",
  COMBINED_ANALYSIS = "COMBINED_ANALYSIS",
  INSUFFICIENT_DATA = "INSUFFICIENT_DATA",
}

// ─── Symbol ───────────────────────────────────────────────────────────────────

/** Uniquely identifies a tradeable instrument. */
export interface TradingSymbol {
  ticker: string;
  market: Market;
  name?: string;
}

// ─── MarketData ───────────────────────────────────────────────────────────────

/** Raw OHLCV snapshot for a symbol at a point in time. */
export interface MarketData {
  symbol: TradingSymbol;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  /** CCL rate at capture time — required for CEDEAR valuation. */
  cclRate?: number;
  timestamp: Date;
}

// ─── TechnicalAnalysis ────────────────────────────────────────────────────────

export interface MacdResult {
  value: number;
  signal: number;
  histogram: number;
}

/** Computed indicators derived from price history. */
export interface TechnicalAnalysis {
  symbol: TradingSymbol;
  rsi: number;           // 0–100
  ema20: number;
  ema50: number;
  macd: MacdResult;
  trend: Trend;
  calculatedAt: Date;
}

// ─── NewsAnalysis ─────────────────────────────────────────────────────────────

export interface NewsItem {
  headline: string;
  summary: string;
  source: string;
  url?: string;
  publishedAt: Date;
}

/** Aggregated sentiment derived from recent news for a symbol. */
export interface NewsAnalysis {
  symbol: TradingSymbol;
  items: NewsItem[];
  overallSentiment: Sentiment;
  /** Weighted score across items: -1 (very negative) to +1 (very positive). */
  sentimentScore: number;
  /** Market-impact estimate: 0 (noise) to 1 (highly market-moving). */
  impactScore: number;
  /** One-paragraph synthesis of all items. */
  summary: string;
  analyzedAt: Date;
}

// ─── RiskProfile ─────────────────────────────────────────────────────────────

/** Position sizing and exit levels produced by the RiskManager. */
export interface RiskProfile {
  symbol: TradingSymbol;
  signal: Signal;
  /** Reference price used to calculate levels (last close). */
  entryPrice: number;
  /** Capital fraction to allocate: 0 (none) to MAX_POSITION_SIZE. */
  positionSize: number;
  stopLossPrice:     number;
  takeProfitPrice:   number;
  stopLossPercent:   number;
  takeProfitPercent: number;
  generatedAt: Date;
}

// ─── Portfolio ────────────────────────────────────────────────────────────────

export enum ValidationStatus {
  APPROVED = "APPROVED",
  REJECTED = "REJECTED",
  REDUCED  = "REDUCED", // approved with a smaller position
}

/** An open position currently held in the portfolio. */
export interface Position {
  symbol: TradingSymbol;
  /** Current capital fraction allocated to this position: 0–1. */
  allocation: number;
  entryPrice: number;
  openedAt: Date;
}

/** Result of validating a RiskProfile against the current portfolio. */
export interface TradeValidation {
  status: ValidationStatus;
  riskProfile: RiskProfile;
  /** Final position size after portfolio constraints (may be reduced). */
  adjustedPositionSize: number;
  reason: string;
}

// ─── Execution (paper trading) ────────────────────────────────────────────────

export enum ExecutionStatus {
  EXECUTED = "EXECUTED",
  SKIPPED  = "SKIPPED",
}

/** A simulated order fill. */
export interface SimulatedTrade {
  id: string;
  symbol: TradingSymbol;
  signal: Signal;
  /** Units bought or sold. */
  quantity: number;
  price: number;
  /** quantity × price */
  value: number;
  executedAt: Date;
}

/** An open paper position with real-time P&L. */
export interface ExecutionPosition {
  symbol: TradingSymbol;
  entryTrade: SimulatedTrade;
  stopLossPrice: number;
  takeProfitPrice: number;
  currentPrice: number;
  unrealizedPnL: number;
  unrealizedPnLPercent: number;
}

/** A fully closed paper position. */
export interface ClosedTrade {
  symbol: TradingSymbol;
  entryTrade: SimulatedTrade;
  exitTrade: SimulatedTrade;
  exitReason: "SIGNAL" | "STOP_LOSS" | "TAKE_PROFIT";
  realizedPnL: number;
  realizedPnLPercent: number;
}

/** Full snapshot of the paper account. */
export interface PortfolioSnapshot {
  cash: number;
  positionsValue: number;
  totalValue: number;
  openPositions: ExecutionPosition[];
  closedTrades: ClosedTrade[];
  realizedPnL: number;
  unrealizedPnL: number;
  totalPnL: number;
  snapshotAt: Date;
}

/** Result returned by ExecutionService.simulate(). */
export interface ExecutionResult {
  status: ExecutionStatus;
  trade: SimulatedTrade | null;
  reason: string;
  snapshot: PortfolioSnapshot;
}

// ─── Pipeline ─────────────────────────────────────────────────────────────────

/** Collects every stage output for a single symbol run. */
export interface PipelineResult {
  symbol: TradingSymbol;
  marketData: MarketData;
  technicalAnalysis: TechnicalAnalysis;
  newsAnalysis: NewsAnalysis;
  decision: TradingDecision;
  riskProfile: RiskProfile;
  validation: TradeValidation;
  execution: ExecutionResult;
}

// ─── TradingDecision ─────────────────────────────────────────────────────────

/** Final structured output produced by the agent pipeline. */
export interface TradingDecision {
  symbol: TradingSymbol;
  signal: Signal;
  /** Confidence level from 0 (none) to 1 (certain). */
  confidence: number;
  reason: DecisionReason;
  reasoning: string;
  technicalAnalysis: TechnicalAnalysis;
  newsAnalysis: NewsAnalysis;
  generatedAt: Date;
}
