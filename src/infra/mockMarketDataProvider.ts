import type { IMarketDataProvider } from "../core/interfaces.js";
import type { MarketData, TradingSymbol } from "../core/types.js";
import { DEFAULT_MOCK_ROW, MOCK_MARKET_DATA } from "./marketDataMock.js";

/**
 * IMarketDataProvider backed by static mock data.
 * Replace with HttpMarketDataProvider (or similar) for live feeds.
 */
export class MockMarketDataProvider implements IMarketDataProvider {
  async getMarketData(symbol: TradingSymbol): Promise<MarketData> {
    const row = MOCK_MARKET_DATA[symbol.ticker] ?? DEFAULT_MOCK_ROW;

    return {
      symbol,
      ...row,
      timestamp: new Date(),
    };
  }
}
