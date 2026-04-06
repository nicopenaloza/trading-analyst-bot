// Returns current prices + last cached decision for every watchlist ticker.
// Fast: only Yahoo Finance calls, no LLM.

import { NextResponse } from "next/server";
import { readWatchlist } from "@/lib/watchlist";
import { services } from "@/lib/services";
import type { MarketData, TradingDecision } from "@bot/core/types.js";

export interface TickerSnapshot {
  ticker:        string;
  market:        string;
  marketData:    MarketData | null;
  lastDecision:  TradingDecision | null;
  changePercent: number | null;
  error:         string | null;
}

export async function GET() {
  const watchlist = await readWatchlist();

  const snapshots = await Promise.all(
    watchlist.map(async (entry): Promise<TickerSnapshot> => {
      const base: TickerSnapshot = {
        ticker: entry.ticker,
        market: entry.market,
        marketData:   null,
        lastDecision: null,
        changePercent: null,
        error: null,
      };

      try {
        // Fetch current price (fast — no LLM)
        const md = await services.marketData.getMarketData(entry);
        const changePercent = ((md.close - md.open) / md.open) * 100;

        // Get last stored decision for this ticker
        const decisions = await services.repos.decisions.findByTicker(entry.ticker);
        const lastDecision = decisions.length > 0
          ? decisions[decisions.length - 1]!
          : null;

        return { ...base, marketData: md, lastDecision, changePercent };
      } catch (err) {
        return { ...base, error: String(err) };
      }
    }),
  );

  return NextResponse.json(snapshots);
}
