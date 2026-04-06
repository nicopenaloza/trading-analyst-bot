// Pure indicator math — no side effects, no I/O, no LLM

import type { MacdResult } from "../core/types.js";

// ─── EMA ─────────────────────────────────────────────────────────────────────

/**
 * Returns the full EMA array (oldest → newest).
 * Output length = closes.length - period + 1.
 */
export function emaArray(closes: number[], period: number): number[] {
  if (closes.length < period) {
    throw new Error(`emaArray: need at least ${period} prices, got ${closes.length}`);
  }

  const k = 2 / (period + 1);

  // Seed with SMA of the first `period` values
  let current = closes.slice(0, period).reduce((a, b) => a + b, 0) / period;
  const result: number[] = [current];

  for (let i = period; i < closes.length; i++) {
    current = closes[i]! * k + current * (1 - k);
    result.push(current);
  }

  return result;
}

/** Returns only the last (most recent) EMA value. */
export function ema(closes: number[], period: number): number {
  const arr = emaArray(closes, period);
  return arr[arr.length - 1]!;
}

// ─── RSI ─────────────────────────────────────────────────────────────────────

/**
 * Wilder's RSI.
 * Requires at least period + 1 prices (to produce `period` changes).
 */
export function rsi(closes: number[], period = 14): number {
  if (closes.length < period + 1) {
    throw new Error(`rsi: need at least ${period + 1} prices, got ${closes.length}`);
  }

  const changes = closes.slice(1).map((p, i) => p - closes[i]!);

  // Seed averages from the first `period` changes
  let avgGain = 0;
  let avgLoss = 0;
  for (let i = 0; i < period; i++) {
    const c = changes[i]!;
    if (c > 0) avgGain += c;
    else avgLoss += -c;
  }
  avgGain /= period;
  avgLoss /= period;

  // Wilder's smoothing for remaining changes
  for (let i = period; i < changes.length; i++) {
    const c = changes[i]!;
    avgGain = (avgGain * (period - 1) + (c > 0 ? c : 0)) / period;
    avgLoss = (avgLoss * (period - 1) + (c < 0 ? -c : 0)) / period;
  }

  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

// ─── MACD ─────────────────────────────────────────────────────────────────────

/**
 * Standard MACD (12, 26, 9).
 * Requires at least 26 + 9 - 1 = 34 prices for the signal line.
 */
export function macd(closes: number[]): MacdResult {
  const FAST = 12;
  const SLOW = 26;
  const SIGNAL = 9;
  const MIN = SLOW + SIGNAL - 1;

  if (closes.length < MIN) {
    throw new Error(`macd: need at least ${MIN} prices, got ${closes.length}`);
  }

  const ema12 = emaArray(closes, FAST);   // length = closes.length - FAST + 1
  const ema26 = emaArray(closes, SLOW);   // length = closes.length - SLOW + 1

  // Align to the shorter (ema26) series
  const offset = SLOW - FAST;
  const macdLine = ema26.map((v, i) => ema12[i + offset]! - v);

  const signalLine = emaArray(macdLine, SIGNAL);

  const lastMacd   = macdLine[macdLine.length - 1]!;
  const lastSignal = signalLine[signalLine.length - 1]!;

  return {
    value:     lastMacd,
    signal:    lastSignal,
    histogram: lastMacd - lastSignal,
  };
}
