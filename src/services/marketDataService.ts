// MarketDataService — IMarketDataProvider implementation.
//
// Bridges the domain interface (IMarketDataProvider) and the infra layer
// (IMarketDataClient). This is the correct place to add cross-cutting concerns
// such as caching, retry logic, or circuit-breaking in the future.

import type { IMarketDataClient, IMarketDataProvider } from "../core/interfaces.js";
import type { MarketData, TradingSymbol } from "../core/types.js";

export class MarketDataService implements IMarketDataProvider {
  constructor(private readonly client: IMarketDataClient) {}

  async getMarketData(symbol: TradingSymbol): Promise<MarketData> {
    try {
      return await this.client.fetchQuote(symbol);
    } catch (err) {
      throw new Error(
        `MarketDataService: could not fetch data for "${symbol.ticker}" — ${String(err)}`,
      );
    }
  }
}
