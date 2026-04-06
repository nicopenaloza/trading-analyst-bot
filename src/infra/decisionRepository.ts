import type { TradingDecision } from "../core/types.js";
import { JsonStore } from "./jsonStore.js";

export class DecisionRepository {
  private readonly store: JsonStore<TradingDecision>;

  constructor(dataDir: string) {
    this.store = new JsonStore(`${dataDir}/decisions.json`);
  }

  save(decision: TradingDecision): Promise<void> {
    return this.store.append(decision);
  }

  findAll(): Promise<TradingDecision[]> {
    return this.store.readAll();
  }

  findByTicker(ticker: string): Promise<TradingDecision[]> {
    return this.store.findWhere((d) => d.symbol.ticker === ticker);
  }
}
