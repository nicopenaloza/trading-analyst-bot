// Singleton bot services for API routes.
// Uses globalThis to survive Next.js hot-reload in development.

import path from "path";

import { YahooFinanceClient }       from "@bot/infra/api/yahooFinanceClient.js";
import { MarketDataService }         from "@bot/services/marketDataService.js";
import { TechnicalAnalysisService }  from "@bot/services/technicalAnalysisService.js";
import { NewsService }               from "@bot/services/newsService.js";
import { RiskManager }               from "@bot/services/riskManager.js";
import { PortfolioManager }          from "@bot/services/portfolioManager.js";
import { ExecutionService }          from "@bot/services/executionService.js";
import { Orchestrator }              from "@bot/orchestrator/orchestrator.js";
import { DecisionRepository }        from "@bot/infra/decisionRepository.js";
import { TradeRepository }           from "@bot/infra/tradeRepository.js";
import { MarketDataRepository }      from "@bot/infra/marketDataRepository.js";
import { createLogger }              from "@bot/infra/logger.js";

// data/ lives one level above dashboard/
const DATA_DIR = path.join(process.cwd(), "../data");

interface TradingServices {
  orchestrator:  Orchestrator;
  execution:     ExecutionService;
  portfolio:     PortfolioManager;
  repos: {
    decisions:  DecisionRepository;
    trades:     TradeRepository;
    marketData: MarketDataRepository;
  };
  marketData: MarketDataService;
  technical:  TechnicalAnalysisService;
}

function buildServices(): TradingServices {
  const logger     = createLogger("info");
  const marketData = new MarketDataService(new YahooFinanceClient());
  const technical  = new TechnicalAnalysisService();
  const news       = new NewsService(logger);
  const risk       = new RiskManager();
  const portfolio  = new PortfolioManager();
  const execution  = new ExecutionService();

  const repos = {
    decisions:  new DecisionRepository(DATA_DIR),
    trades:     new TradeRepository(DATA_DIR),
    marketData: new MarketDataRepository(DATA_DIR),
  };

  const orchestrator = new Orchestrator(
    marketData, technical, news,
    risk, portfolio, execution,
    repos, logger,
  );

  return { orchestrator, execution, portfolio, repos, marketData, technical };
}

// Persist across hot reloads in development
const g = global as typeof globalThis & { _tradingServices?: TradingServices };
if (!g._tradingServices) g._tradingServices = buildServices();

export const services = g._tradingServices;
