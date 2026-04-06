import { tool } from "@anthropic-ai/claude-agent-sdk";
import { z } from "zod/v4";
import type { IMarketDataProvider } from "../../core/interfaces.js";
import type { TradingSymbol } from "../../core/types.js";
import { okResponse, errResponse } from "./toolResponse.js";

// ─── Input schema ─────────────────────────────────────────────────────────────

const inputSchema = {
  ticker: z.string().describe("Ticker symbol, e.g. GGAL, YPF, AAPL"),
  market: z.enum(["BYMA", "CEDEAR"]).describe("Exchange: BYMA for Argentine equities, CEDEAR for US stocks traded locally"),
};

// ─── Output enrichment ────────────────────────────────────────────────────────

function buildOutput(data: Awaited<ReturnType<IMarketDataProvider["getMarketData"]>>) {
  const changePercent = ((data.close - data.open) / data.open) * 100;
  const dayRange      = data.high - data.low;

  return {
    ticker:        data.symbol.ticker,
    market:        data.symbol.market,
    // OHLCV
    open:          data.open,
    high:          data.high,
    low:           data.low,
    close:         data.close,
    volume:        data.volume,
    // Derived
    changePercent: parseFloat(changePercent.toFixed(2)),
    dayRange:      parseFloat(dayRange.toFixed(2)),
    // CEDEARs: include CCL rate for USD conversion
    ...(data.cclRate !== undefined && {
      cclRate:        data.cclRate,
      closeUsd:       parseFloat((data.close / data.cclRate).toFixed(4)),
    }),
    timestamp: data.timestamp,
  };
}

// ─── Tool ─────────────────────────────────────────────────────────────────────

export function createMarketDataTool(
  provider: IMarketDataProvider,
  symbol: TradingSymbol,
) {
  return tool(
    "market_data",
    `Fetch the current OHLCV price snapshot for a symbol.
Returns: open, high, low, close, volume, daily change %, and day range.
For CEDEARs also returns the CCL exchange rate and USD-equivalent close price.`,
    inputSchema,
    async (_args) => {
      try {
        const data = await provider.getMarketData(symbol);
        return okResponse(buildOutput(data));
      } catch (err) {
        return errResponse(err);
      }
    },
  );
}
