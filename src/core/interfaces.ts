// Port interfaces — dependency inversion boundaries for all layers

import type {
  ClosedTrade,
  MarketData,
  NewsAnalysis,
  Position,
  RiskProfile,
  SimulatedTrade,
  TechnicalAnalysis,
  TradingDecision,
  TradingSymbol,
  TradeValidation,
} from "./types.js";

// ─── Data clients (external API adapters) ────────────────────────────────────

/**
 * Low-level contract for any external market data source.
 * Implementations handle the HTTP transport, ticker mapping, and field
 * normalisation for a specific vendor (Yahoo Finance, IOL, etc.).
 */
export interface IMarketDataClient {
  fetchQuote(symbol: TradingSymbol): Promise<MarketData>;
}

// ─── Data providers ───────────────────────────────────────────────────────────

export interface IMarketDataProvider {
  getMarketData(symbol: TradingSymbol): Promise<MarketData>;
}

export interface ITechnicalAnalysisProvider {
  getAnalysis(symbol: TradingSymbol): Promise<TechnicalAnalysis>;
}

export interface INewsProvider {
  getAnalysis(symbol: TradingSymbol): Promise<NewsAnalysis>;
}

// ─── Domain services ──────────────────────────────────────────────────────────

export interface IRiskManager {
  evaluate(decision: TradingDecision, marketData: MarketData): RiskProfile;
}

export interface IPortfolioManager {
  validate(riskProfile: RiskProfile): TradeValidation;
  open(riskProfile: RiskProfile, finalSize: number): void;
  close(ticker: string): void;
  getPositions(): Position[];
  getTotalExposure(): number;
  getExposure(ticker: string): number;
}

// ─── Repositories ─────────────────────────────────────────────────────────────

export interface IDecisionRepository {
  save(decision: TradingDecision): Promise<void>;
  findAll(): Promise<TradingDecision[]>;
  findByTicker(ticker: string): Promise<TradingDecision[]>;
}

export interface ITradeRepository {
  saveExecuted(trade: SimulatedTrade): Promise<void>;
  saveClosed(trade: ClosedTrade): Promise<void>;
  findAllExecuted(): Promise<SimulatedTrade[]>;
  findAllClosed(): Promise<ClosedTrade[]>;
}

export interface IMarketDataRepository {
  save(data: MarketData): Promise<void>;
  findAll(): Promise<MarketData[]>;
  findByTicker(ticker: string): Promise<MarketData[]>;
}

export interface Repositories {
  decisions:  IDecisionRepository;
  trades:     ITradeRepository;
  marketData: IMarketDataRepository;
}
