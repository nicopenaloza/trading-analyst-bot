import type { IMarketDataProvider, INewsProvider, ITechnicalAnalysisProvider } from "../../core/interfaces.js";
import type { TradingSymbol } from "../../core/types.js";
import { createMarketDataTool }        from "./marketDataTool.js";
import { createTechnicalAnalysisTool } from "./technicalAnalysisTool.js";
import { createNewsAnalysisTool }      from "./newsAnalysisTool.js";

export { createMarketDataTool, createTechnicalAnalysisTool, createNewsAnalysisTool };

/** Builds all three trading tools bound to a specific symbol. */
export function buildTradingTools(
  symbol: TradingSymbol,
  marketData: IMarketDataProvider,
  technical: ITechnicalAnalysisProvider,
  news: INewsProvider,
) {
  return [
    createMarketDataTool(marketData, symbol),
    createTechnicalAnalysisTool(technical, symbol),
    createNewsAnalysisTool(news, symbol),
  ] as const;
}
