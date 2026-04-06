// ExecutionService — paper trading simulator. No real orders, no I/O.
// Tracks positions and P&L fully in memory.

import { ExecutionStatus, Signal, ValidationStatus } from "../core/types.js";
import type {
  ClosedTrade,
  ExecutionPosition,
  ExecutionResult,
  MarketData,
  PortfolioSnapshot,
  RiskProfile,
  SimulatedTrade,
  TradeValidation,
} from "../core/types.js";

// ─── Constants ────────────────────────────────────────────────────────────────

const DEFAULT_STARTING_CAPITAL = 100_000;

// ─── ExecutionService ─────────────────────────────────────────────────────────

export class ExecutionService {
  private cash: number;
  private readonly openPositions = new Map<string, ExecutionPosition>();
  private readonly closedTrades:  ClosedTrade[] = [];
  private tradeCounter = 0;

  constructor(startingCapital = DEFAULT_STARTING_CAPITAL) {
    this.cash = startingCapital;
  }

  // ── Public API ──────────────────────────────────────────────────────────────

  /**
   * Simulates execution of a validated trade.
   * BUY → opens position. SELL → closes existing long. Anything else → skipped.
   */
  simulate(validation: TradeValidation, marketData: MarketData): ExecutionResult {
    if (validation.status === ValidationStatus.REJECTED || validation.adjustedPositionSize === 0) {
      return this.skipped(validation.reason);
    }

    const { signal } = validation.riskProfile;

    if (signal === Signal.BUY)  return this.executeBuy(validation, marketData);
    if (signal === Signal.SELL) return this.executeSell(validation, marketData);

    return this.skipped(`No execution for signal: ${signal}`);
  }

  /**
   * Checks open positions for stop-loss or take-profit triggers at the given price.
   * Returns closed trades triggered by exits; updates internal state.
   */
  checkExits(ticker: string, currentPrice: number): ClosedTrade | null {
    const position = this.openPositions.get(ticker);
    if (!position) return null;

    const hitStopLoss   = currentPrice <= position.stopLossPrice;
    const hitTakeProfit = currentPrice >= position.takeProfitPrice;

    if (!hitStopLoss && !hitTakeProfit) return null;

    const reason = hitTakeProfit ? "TAKE_PROFIT" : "STOP_LOSS";
    return this.closePosition(ticker, currentPrice, reason);
  }

  /** Updates unrealized P&L for a position given a new price. */
  updatePrice(ticker: string, currentPrice: number): void {
    const position = this.openPositions.get(ticker);
    if (!position) return;

    const { entryTrade } = position;
    const unrealizedPnL        = (currentPrice - entryTrade.price) * entryTrade.quantity;
    const unrealizedPnLPercent = (currentPrice - entryTrade.price) / entryTrade.price;

    this.openPositions.set(ticker, {
      ...position,
      currentPrice,
      unrealizedPnL,
      unrealizedPnLPercent,
    });
  }

  getSnapshot(): PortfolioSnapshot {
    const positions       = [...this.openPositions.values()];
    const positionsValue  = positions.reduce((sum, p) => sum + p.entryTrade.value + p.unrealizedPnL, 0);
    const unrealizedPnL   = positions.reduce((sum, p) => sum + p.unrealizedPnL, 0);
    const realizedPnL     = this.closedTrades.reduce((sum, t) => sum + t.realizedPnL, 0);

    return {
      cash:            this.cash,
      positionsValue,
      totalValue:      this.cash + positionsValue,
      openPositions:   positions,
      closedTrades:    [...this.closedTrades],
      realizedPnL,
      unrealizedPnL,
      totalPnL:        realizedPnL + unrealizedPnL,
      snapshotAt:      new Date(),
    };
  }

  // ── Internal ────────────────────────────────────────────────────────────────

  private executeBuy(validation: TradeValidation, marketData: MarketData): ExecutionResult {
    const ticker  = validation.riskProfile.symbol.ticker;

    if (this.openPositions.has(ticker)) {
      return this.skipped(`Already holding ${ticker} — no pyramid`);
    }

    const { riskProfile } = validation;
    const tradeValue = this.cash * validation.adjustedPositionSize;

    if (tradeValue > this.cash) {
      return this.skipped("Insufficient cash");
    }

    const price    = marketData.close;
    const quantity = tradeValue / price;

    const trade = this.makeTrade(riskProfile, Signal.BUY, quantity, price);
    this.cash -= tradeValue;

    this.openPositions.set(ticker, {
      symbol:               riskProfile.symbol,
      entryTrade:           trade,
      stopLossPrice:        riskProfile.stopLossPrice,
      takeProfitPrice:      riskProfile.takeProfitPrice,
      currentPrice:         price,
      unrealizedPnL:        0,
      unrealizedPnLPercent: 0,
    });

    return { status: ExecutionStatus.EXECUTED, trade, reason: `BUY ${quantity.toFixed(4)} ${ticker} @ ${price}`, snapshot: this.getSnapshot() };
  }

  private executeSell(validation: TradeValidation, marketData: MarketData): ExecutionResult {
    const ticker = validation.riskProfile.symbol.ticker;

    if (!this.openPositions.has(ticker)) {
      return this.skipped(`No open position for ${ticker} — cannot sell`);
    }

    const closed = this.closePosition(ticker, marketData.close, "SIGNAL");
    return {
      status:   ExecutionStatus.EXECUTED,
      trade:    closed.exitTrade,
      reason:   `SELL ${closed.exitTrade.quantity.toFixed(4)} ${ticker} @ ${closed.exitTrade.price} | PnL: ${closed.realizedPnL.toFixed(2)}`,
      snapshot: this.getSnapshot(),
    };
  }

  private closePosition(
    ticker: string,
    exitPrice: number,
    exitReason: ClosedTrade["exitReason"],
  ): ClosedTrade {
    const position  = this.openPositions.get(ticker)!;
    const { entryTrade } = position;
    const exitValue = entryTrade.quantity * exitPrice;

    const exitTrade = this.makeTrade(
      position as unknown as RiskProfile,
      Signal.SELL,
      entryTrade.quantity,
      exitPrice,
    );

    const realizedPnL        = exitValue - entryTrade.value;
    const realizedPnLPercent = realizedPnL / entryTrade.value;

    const closed: ClosedTrade = {
      symbol: position.symbol,
      entryTrade,
      exitTrade,
      exitReason,
      realizedPnL,
      realizedPnLPercent,
    };

    this.cash += exitValue;
    this.openPositions.delete(ticker);
    this.closedTrades.push(closed);

    return closed;
  }

  private makeTrade(
    source: Pick<RiskProfile, "symbol">,
    signal: Signal,
    quantity: number,
    price: number,
  ): SimulatedTrade {
    return {
      id:          `T${String(++this.tradeCounter).padStart(4, "0")}`,
      symbol:      source.symbol,
      signal,
      quantity,
      price,
      value:       quantity * price,
      executedAt:  new Date(),
    };
  }

  private skipped(reason: string): ExecutionResult {
    return { status: ExecutionStatus.SKIPPED, trade: null, reason, snapshot: this.getSnapshot() };
  }
}
