import { loadConfig } from "./infra/config.js";
import { createLogger } from "./infra/logger.js";
import { MockMarketDataProvider } from "./infra/mockMarketDataProvider.js";
import { DecisionRepository } from "./infra/decisionRepository.js";
import { TradeRepository } from "./infra/tradeRepository.js";
import { MarketDataRepository } from "./infra/marketDataRepository.js";
import { TechnicalAnalysisService } from "./services/technicalAnalysisService.js";
import { NewsService } from "./services/newsService.js";
import { RiskManager } from "./services/riskManager.js";
import { PortfolioManager } from "./services/portfolioManager.js";
import { ExecutionService } from "./services/executionService.js";
import { Orchestrator } from "./orchestrator/orchestrator.js";
import { Scheduler } from "./orchestrator/scheduler.js";
import { Market } from "./core/types.js";
import type { TradingSymbol } from "./core/types.js";

const DATA_DIR = "./data";

async function main(): Promise<void> {
  const config = loadConfig();
  const logger = createLogger(config.logLevel);

  const symbols: TradingSymbol[] = config.watchedTickers.map((ticker) => ({
    ticker,
    market: Market.BYMA,
  }));

  const orchestrator = new Orchestrator(
    new MockMarketDataProvider(),
    new TechnicalAnalysisService(),
    new NewsService(logger),
    new RiskManager(),
    new PortfolioManager(),
    new ExecutionService(),
    {
      decisions:  new DecisionRepository(DATA_DIR),
      trades:     new TradeRepository(DATA_DIR),
      marketData: new MarketDataRepository(DATA_DIR),
    },
    logger,
  );

  const scheduler = new Scheduler(
    orchestrator,
    { intervalMinutes: config.intervalMinutes, symbols },
    logger,
  );

  scheduler.start();
}

main().catch((err) => {
  console.error(JSON.stringify({ level: "error", msg: "Fatal error", err: String(err) }));
  process.exit(1);
});
