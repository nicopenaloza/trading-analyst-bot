// Generates a deterministic OHLCV price series anchored to the mock snapshot.
// Same ticker → same series across runs (seeded RNG).

import type { MarketData, TradingSymbol } from "../core/types.js";
import { DEFAULT_MOCK_ROW, MOCK_MARKET_DATA } from "./marketDataMock.js";

/** Linear congruential generator — deterministic for a given seed. */
function makeRng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

function tickerSeed(ticker: string): number {
  return ticker.split("").reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
}

/**
 * Returns `candles` daily bars ordered oldest → newest.
 * The last close is approximately equal to the mock snapshot close.
 */
export function generatePriceHistory(
  symbol: TradingSymbol,
  candles = 60,
): MarketData[] {
  const anchor = MOCK_MARKET_DATA[symbol.ticker] ?? DEFAULT_MOCK_ROW;
  const rng    = makeRng(tickerSeed(symbol.ticker));

  // Walk backward from anchor.close to get a starting price,
  // then replay forward so the series ends near anchor.close.
  const DAILY_VOLATILITY = 0.015; // ±1.5% per day
  const DRIFT            = 0.0005; // slight upward bias

  // Simulate backward to find a plausible starting price
  let price = anchor.close;
  for (let i = 0; i < candles - 1; i++) {
    const move = (rng() - 0.5 - DRIFT) * DAILY_VOLATILITY;
    price = price / (1 + move);
  }

  // Replay forward using the same RNG (re-seed for reproducibility)
  const rng2 = makeRng(tickerSeed(symbol.ticker));
  const history: MarketData[] = [];
  const now = new Date();

  for (let i = 0; i < candles; i++) {
    const move  = (rng2() - 0.5 + DRIFT) * DAILY_VOLATILITY;
    price       = price * (1 + move);

    const spread = price * 0.004 * rng2();
    const open   = price;
    const close  = price + (rng2() - 0.5) * spread;
    const high   = Math.max(open, close) + spread * rng2();
    const low    = Math.min(open, close) - spread * rng2();
    const volume = anchor.volume * (0.6 + rng2() * 0.8);

    const timestamp = new Date(now);
    timestamp.setDate(now.getDate() - (candles - 1 - i));

    history.push({
      symbol,
      open,
      high,
      low,
      close,
      volume,
      ...(anchor.cclRate !== undefined && { cclRate: anchor.cclRate }),
      timestamp,
    });
  }

  return history;
}
