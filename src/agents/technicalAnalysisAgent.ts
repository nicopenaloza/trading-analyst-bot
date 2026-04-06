import type { MarketData, TechnicalAnalysis } from "../core/types.js";
import { Trend } from "../core/types.js";
import { ema, macd, rsi } from "./indicators.js";

/** Minimum candles required to compute all indicators. */
export const MIN_HISTORY_LENGTH = 60;

/**
 * Deterministic technical analysis — no LLM, no I/O.
 * Accepts an ordered (oldest → newest) price history and returns indicators.
 */
export class TechnicalAnalysisAgent {
  analyze(history: MarketData[]): TechnicalAnalysis {
    if (history.length < MIN_HISTORY_LENGTH) {
      throw new Error(
        `TechnicalAnalysisAgent: need at least ${MIN_HISTORY_LENGTH} candles, got ${history.length}`,
      );
    }

    const symbol = history[history.length - 1]!.symbol;
    const closes = history.map((c) => c.close);

    const ema20   = ema(closes, 20);
    const ema50   = ema(closes, 50);
    const rsiVal  = rsi(closes, 14);
    const macdVal = macd(closes);
    const trend   = detectTrend(ema20, ema50, rsiVal);

    return {
      symbol,
      rsi:          rsiVal,
      ema20,
      ema50,
      macd:         macdVal,
      trend,
      calculatedAt: new Date(),
    };
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function detectTrend(ema20: number, ema50: number, rsiVal: number): Trend {
  const emaCrossed = ema20 > ema50;
  const rsiStrong  = rsiVal > 55;
  const rsiWeak    = rsiVal < 45;

  if (emaCrossed && rsiStrong)  return Trend.BULLISH;
  if (!emaCrossed && rsiWeak)   return Trend.BEARISH;
  return Trend.NEUTRAL;
}
