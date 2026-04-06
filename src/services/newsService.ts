import type { INewsProvider } from "../core/interfaces.js";
import type { NewsAnalysis, TradingSymbol } from "../core/types.js";
import { NewsAnalysisAgent } from "../agents/newsAnalysisAgent.js";
import type { Logger } from "../infra/logger.js";
import { getMockNews } from "../infra/newsMock.js";

export class NewsService implements INewsProvider {
  private readonly agent: NewsAnalysisAgent;

  constructor(logger?: Logger) {
    this.agent = new NewsAnalysisAgent(logger);
  }

  async getAnalysis(symbol: TradingSymbol): Promise<NewsAnalysis> {
    const items = getMockNews(symbol.ticker);
    return this.agent.analyze(symbol, items);
  }
}
