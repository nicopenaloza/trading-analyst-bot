// RiskManager — deterministic position sizing and exit levels. No LLM.

import { Signal } from "../core/types.js";
import type { IRiskManager } from "../core/interfaces.js";
import type { MarketData, RiskProfile, TradingDecision } from "../core/types.js";

// ─── Constants ────────────────────────────────────────────────────────────────

/** Maximum capital fraction per position (10%). */
const MAX_POSITION_SIZE  = 0.10;

/** Default stop-loss distance from entry (3%). */
const STOP_LOSS_PCT      = 0.03;

/** Default take-profit distance from entry (8%). */
const TAKE_PROFIT_PCT    = 0.08;

/** Minimum confidence required to open any position. */
const MIN_CONFIDENCE     = 0.20;

// ─── RiskManager ─────────────────────────────────────────────────────────────

export class RiskManager implements IRiskManager {
  evaluate(decision: TradingDecision, marketData: MarketData): RiskProfile {
    const entryPrice = marketData.close;

    // No position for HOLD or low-confidence signals
    if (decision.signal === Signal.HOLD || decision.confidence < MIN_CONFIDENCE) {
      return noPosition(decision, entryPrice);
    }

    // Scale position linearly with confidence, capped at MAX_POSITION_SIZE
    const positionSize = clamp(decision.confidence * MAX_POSITION_SIZE, 0, MAX_POSITION_SIZE);

    const { stopLossPrice, takeProfitPrice } = exitLevels(
      decision.signal,
      entryPrice,
    );

    return {
      symbol:            decision.symbol,
      signal:            decision.signal,
      entryPrice,
      positionSize,
      stopLossPrice,
      takeProfitPrice,
      stopLossPercent:   STOP_LOSS_PCT,
      takeProfitPercent: TAKE_PROFIT_PCT,
      generatedAt:       new Date(),
    };
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function exitLevels(
  signal: Signal,
  entry: number,
): { stopLossPrice: number; takeProfitPrice: number } {
  if (signal === Signal.BUY) {
    return {
      stopLossPrice:   round(entry * (1 - STOP_LOSS_PCT)),
      takeProfitPrice: round(entry * (1 + TAKE_PROFIT_PCT)),
    };
  }

  // SELL (short): stop above entry, target below entry
  return {
    stopLossPrice:   round(entry * (1 + STOP_LOSS_PCT)),
    takeProfitPrice: round(entry * (1 - TAKE_PROFIT_PCT)),
  };
}

function noPosition(decision: TradingDecision, entryPrice: number): RiskProfile {
  return {
    symbol:            decision.symbol,
    signal:            decision.signal,
    entryPrice,
    positionSize:      0,
    stopLossPrice:     entryPrice,
    takeProfitPrice:   entryPrice,
    stopLossPercent:   0,
    takeProfitPercent: 0,
    generatedAt:       new Date(),
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/** Round to 2 decimal places for display-friendly prices. */
function round(value: number): number {
  return Math.round(value * 100) / 100;
}
