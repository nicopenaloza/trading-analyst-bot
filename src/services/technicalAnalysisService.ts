import type { ITechnicalAnalysisProvider } from "../core/interfaces.js";
import type { TechnicalAnalysis, TradingSymbol } from "../core/types.js";
import { TechnicalAnalysisAgent, MIN_HISTORY_LENGTH } from "../agents/technicalAnalysisAgent.js";
import { generatePriceHistory } from "../infra/priceHistoryMock.js";

/**
 * Implements ITechnicalAnalysisProvider.
 * Fetches (or generates) price history, then delegates math to TechnicalAnalysisAgent.
 * Swap `generatePriceHistory` for a real OHLCV feed when ready.
 */
export class TechnicalAnalysisService implements ITechnicalAnalysisProvider {
  private readonly agent = new TechnicalAnalysisAgent();

  async getAnalysis(symbol: TradingSymbol): Promise<TechnicalAnalysis> {
    const history = generatePriceHistory(symbol, MIN_HISTORY_LENGTH);
    return this.agent.analyze(history);
  }
}
