// YahooFinanceClient — IMarketDataClient implementation backed by yahoo-finance2.
//
// Ticker mapping:
//   BYMA   → appends ".BA" suffix  (e.g. GGAL → GGAL.BA)
//   CEDEAR → uses the US ticker as-is (e.g. AAPL → AAPL)
//
// CEDEARs are returned with prices in USD; cclRate is left undefined until a
// dedicated CCL rate provider is wired in.

import YahooFinance from "yahoo-finance2";
import type { IMarketDataClient } from "../../core/interfaces.js";
import { Market } from "../../core/types.js";
import type { MarketData, TradingSymbol } from "../../core/types.js";

const yf = new YahooFinance({ suppressNotices: ["yahooSurvey"] });

// ─── Ticker mapping ───────────────────────────────────────────────────────────

function toYahooTicker(symbol: TradingSymbol): string {
  return symbol.market === Market.BYMA
    ? `${symbol.ticker}.BA`
    : symbol.ticker;
}

// ─── YahooFinanceClient ───────────────────────────────────────────────────────

export class YahooFinanceClient implements IMarketDataClient {
  async fetchQuote(symbol: TradingSymbol): Promise<MarketData> {
    const yahooTicker = toYahooTicker(symbol);

    let quote: Awaited<ReturnType<typeof yf.quote>> | undefined;

    try {
      quote = await yf.quote(yahooTicker);
    } catch (err) {
      throw new Error(
        `Yahoo Finance request failed for "${yahooTicker}": ${String(err)}`,
      );
    }

    // Yahoo returns undefined for unknown or delisted tickers
    if (!quote) {
      throw new Error(`Ticker not found on Yahoo Finance: "${yahooTicker}"`);
    }

    const price = quote.regularMarketPrice;

    if (price === undefined || price === null) {
      throw new Error(
        `No market price available for "${yahooTicker}" — market may be closed or ticker suspended`,
      );
    }

    // Fallback to close price when intraday OHLC fields are absent
    // (can happen outside trading hours for some exchanges)
    return {
      symbol: {
        ...symbol,
        name: quote.shortName ?? symbol.name,
      },
      open:      quote.regularMarketOpen     ?? price,
      high:      quote.regularMarketDayHigh  ?? price,
      low:       quote.regularMarketDayLow   ?? price,
      close:     price,
      volume:    quote.regularMarketVolume   ?? 0,
      // cclRate left undefined for CEDEARs until a CCL provider is available
      timestamp: quote.regularMarketTime     ?? new Date(),
    };
  }
}
