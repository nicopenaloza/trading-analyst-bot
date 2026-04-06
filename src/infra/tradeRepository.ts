import type { ClosedTrade, SimulatedTrade } from "../core/types.js";
import { JsonStore } from "./jsonStore.js";

export class TradeRepository {
  private readonly executed: JsonStore<SimulatedTrade>;
  private readonly closed:   JsonStore<ClosedTrade>;

  constructor(dataDir: string) {
    this.executed = new JsonStore(`${dataDir}/trades_executed.json`);
    this.closed   = new JsonStore(`${dataDir}/trades_closed.json`);
  }

  saveExecuted(trade: SimulatedTrade): Promise<void> {
    return this.executed.append(trade);
  }

  saveClosed(trade: ClosedTrade): Promise<void> {
    return this.closed.append(trade);
  }

  findAllExecuted(): Promise<SimulatedTrade[]> {
    return this.executed.readAll();
  }

  findAllClosed(): Promise<ClosedTrade[]> {
    return this.closed.readAll();
  }


}
