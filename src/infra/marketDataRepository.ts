import type { MarketData } from "../core/types.js";
import { JsonStore } from "./jsonStore.js";

export class MarketDataRepository {
  private readonly store: JsonStore<MarketData>;

  constructor(dataDir: string) {
    this.store = new JsonStore(`${dataDir}/market_data.json`);
  }

  save(data: MarketData): Promise<void> {
    return this.store.append(data);
  }

  findAll(): Promise<MarketData[]> {
    return this.store.readAll();
  }

  findByTicker(ticker: string): Promise<MarketData[]> {
    return this.store.findWhere((d) => d.symbol.ticker === ticker);
  }

}
