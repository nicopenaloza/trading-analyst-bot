import type {
  IMarketDataProvider,
  INewsProvider,
  IPortfolioManager,
  IRiskManager,
  ITechnicalAnalysisProvider,
  Repositories,
} from "../core/interfaces.js";
import { ExecutionStatus } from "../core/types.js";
import type {
  MarketData,
  NewsAnalysis,
  PipelineResult,
  RiskProfile,
  TechnicalAnalysis,
  TradingDecision,
  TradingSymbol,
  TradeValidation,
} from "../core/types.js";
import { MasterTradingAgent } from "../agents/masterTradingAgent.js";
import type { ExecutionService } from "../services/executionService.js";
import type { Logger } from "../infra/logger.js";

export class Orchestrator {
  private readonly agent: MasterTradingAgent;

  constructor(
    private readonly marketData: IMarketDataProvider,
    private readonly technical: ITechnicalAnalysisProvider,
    private readonly news: INewsProvider,
    private readonly risk: IRiskManager,
    private readonly portfolio: IPortfolioManager,
    private readonly execution: ExecutionService,
    private readonly repos: Repositories,
    private readonly logger: Logger,
  ) {
    this.agent = new MasterTradingAgent(marketData, technical, news, logger);
  }

  // ── Main entry point ────────────────────────────────────────────────────────

  async processSymbol(symbol: TradingSymbol): Promise<PipelineResult> {
    this.logger.info("Pipeline start", { ticker: symbol.ticker });

    // Steps 1–3: fetch all data in parallel
    const [marketData, technicalAnalysis, newsAnalysis] = await Promise.all([
      this.step1_getMarketData(symbol),
      this.step2_runTechnicalAnalysis(symbol),
      this.step3_runNewsAnalysis(symbol),
    ]);

    this.logger.debug("Market data", {
      ticker:        symbol.ticker,
      close:         marketData.close,
      volume:        marketData.volume,
      changePercent: parseFloat((((marketData.close - marketData.open) / marketData.open) * 100).toFixed(2)),
    });

    this.logger.debug("Technical analysis", {
      ticker:    symbol.ticker,
      rsi:       parseFloat(technicalAnalysis.rsi.toFixed(2)),
      ema20:     parseFloat(technicalAnalysis.ema20.toFixed(4)),
      ema50:     parseFloat(technicalAnalysis.ema50.toFixed(4)),
      macdHist:  parseFloat(technicalAnalysis.macd.histogram.toFixed(4)),
      trend:     technicalAnalysis.trend,
    });

    this.logger.debug("News analysis", {
      ticker:         symbol.ticker,
      sentiment:      newsAnalysis.overallSentiment,
      sentimentScore: parseFloat(newsAnalysis.sentimentScore.toFixed(3)),
      impactScore:    parseFloat(newsAnalysis.impactScore.toFixed(3)),
      itemCount:      newsAnalysis.items.length,
    });

    // Step 4: Claude Agent reasons over tool outputs → TradingDecision
    const decision    = await this.step4_agentDecision(symbol, technicalAnalysis, newsAnalysis);
    const riskProfile = this.step5_applyRisk(decision, marketData);
    const validation  = this.step6_validatePortfolio(riskProfile);
    const execution   = await this.step7_executeTrade(validation, marketData);

    this.logger.debug("Decision", {
      ticker:     symbol.ticker,
      signal:     decision.signal,
      confidence: decision.confidence.toFixed(2),
      reason:     decision.reason,
      reasoning:  decision.reasoning,
    });

    this.logger.debug("Risk profile", {
      ticker:       symbol.ticker,
      positionSize: (riskProfile.positionSize * 100).toFixed(1) + "%",
      entryPrice:   riskProfile.entryPrice,
      stopLoss:     riskProfile.stopLossPrice,
      takeProfit:   riskProfile.takeProfitPrice,
    });

    this.logger.debug("Validation", {
      ticker:          symbol.ticker,
      status:          validation.status,
      adjustedSize:    (validation.adjustedPositionSize * 100).toFixed(1) + "%",
      validationNote:  validation.reason,
    });

    this.logger.debug("Execution", {
      ticker: symbol.ticker,
      status: execution.status,
      reason: execution.reason,
    });

    if (execution.status === ExecutionStatus.EXECUTED) {
      this.portfolio.open(riskProfile, validation.adjustedPositionSize);
    }

    const result: PipelineResult = {
      symbol, marketData, technicalAnalysis, newsAnalysis,
      decision, riskProfile, validation, execution,
    };

    await this.persist(result);
    this.logResult(result);
    return result;
  }

  // ── Pipeline steps ──────────────────────────────────────────────────────────

  private async step1_getMarketData(symbol: TradingSymbol) {
    this.logger.debug("Step 1 — market data", { ticker: symbol.ticker });
    return this.marketData.getMarketData(symbol);
  }

  private async step2_runTechnicalAnalysis(symbol: TradingSymbol) {
    this.logger.debug("Step 2 — technical analysis", { ticker: symbol.ticker });
    return this.technical.getAnalysis(symbol);
  }

  private async step3_runNewsAnalysis(symbol: TradingSymbol) {
    this.logger.debug("Step 3 — news analysis", { ticker: symbol.ticker });
    return this.news.getAnalysis(symbol);
  }

  private async step4_agentDecision(
    symbol: TradingSymbol,
    technicalAnalysis: TechnicalAnalysis,
    newsAnalysis: NewsAnalysis,
  ) {
    this.logger.debug("Step 4 — Claude agent decision", { ticker: symbol.ticker });
    return this.agent.analyze(symbol, technicalAnalysis, newsAnalysis);
  }

  private step5_applyRisk(
    decision: TradingDecision,
    marketData: MarketData,
  ) {
    this.logger.debug("Step 5 — risk profile", { ticker: decision.symbol.ticker });
    return this.risk.evaluate(decision, marketData);
  }

  private step6_validatePortfolio(
    riskProfile: RiskProfile,
  ) {
    this.logger.debug("Step 6 — portfolio validation", { ticker: riskProfile.symbol.ticker });

    const exit = this.execution.checkExits(
      riskProfile.symbol.ticker,
      riskProfile.entryPrice,
    );

    if (exit) {
      this.repos.trades.saveClosed(exit).catch((err) =>
        this.logger.error("Failed to persist closed trade", { err: String(err) }),
      );
    }

    return this.portfolio.validate(riskProfile);
  }

  private async step7_executeTrade(
    validation: TradeValidation,
    marketData: MarketData,
  ) {
    this.logger.debug("Step 7 — execute trade");
    return this.execution.simulate(validation, marketData);
  }

  // ── Persistence ─────────────────────────────────────────────────────────────

  private async persist(result: PipelineResult): Promise<void> {
    const { symbol, marketData, decision, execution } = result;
    const ticker = symbol.ticker;

    await Promise.allSettled([
      this.repos.marketData.save(marketData)
        .catch((err) => this.logger.error("Failed to persist market data", { ticker, err: String(err) })),
      this.repos.decisions.save(decision)
        .catch((err) => this.logger.error("Failed to persist decision", { ticker, err: String(err) })),
      execution.trade
        ? this.repos.trades.saveExecuted(execution.trade)
            .catch((err) => this.logger.error("Failed to persist trade", { ticker, err: String(err) }))
        : Promise.resolve(),
    ]);
  }

  // ── Logging ─────────────────────────────────────────────────────────────────

  private logResult(result: PipelineResult): void {
    const { symbol, decision, validation, execution, riskProfile } = result;

    this.logger.info("Pipeline complete", {
      ticker:       symbol.ticker,
      signal:       decision.signal,
      confidence:   decision.confidence.toFixed(2),
      reason:       decision.reason,
      validation:   validation.status,
      positionSize: (validation.adjustedPositionSize * 100).toFixed(1) + "%",
      execution:    execution.status,
      ...(execution.status === ExecutionStatus.EXECUTED && {
        entryPrice: riskProfile.entryPrice,
        stopLoss:   riskProfile.stopLossPrice,
        takeProfit: riskProfile.takeProfitPrice,
      }),
    });
  }
}
