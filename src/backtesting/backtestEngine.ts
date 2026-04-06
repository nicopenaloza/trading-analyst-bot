// BacktestEngine — replays historical candles through the deterministic pipeline.
// No LLM calls: uses TechnicalAnalysisAgent + TradingDecisionEngine directly.

import { TechnicalAnalysisAgent } from "../agents/technicalAnalysisAgent.js";
import { TradingDecisionEngine } from "../agents/tradingDecisionEngine.js";
import { Sentiment, Signal } from "../core/types.js";
import type { MarketData, NewsAnalysis } from "../core/types.js";
import { generatePriceHistory } from "../infra/priceHistoryMock.js";
import { computeMetrics } from "./metrics.js";
import type { BacktestConfig, BacktestResult, BacktestTrade, DailySnapshot, ExitReason } from "./types.js";

// ─── Neutral news stub (no LLM in backtesting) ───────────────────────────────

function neutralNews(candle: MarketData): NewsAnalysis {
  return {
    symbol:           candle.symbol,
    items:            [],
    overallSentiment: Sentiment.NEUTRAL,
    sentimentScore:   0,
    impactScore:      0,
    summary:          "No news data in backtest mode.",
    analyzedAt:       candle.timestamp,
  };
}

// ─── Open position state ──────────────────────────────────────────────────────

interface OpenPosition {
  entryDay:       number;
  entryPrice:     number;
  quantity:       number;
  stopLossPrice:  number;
  takeProfitPrice: number;
}

// ─── BacktestEngine ───────────────────────────────────────────────────────────

export class BacktestEngine {
  private readonly ta     = new TechnicalAnalysisAgent();
  private readonly engine = new TradingDecisionEngine();

  run(config: BacktestConfig): BacktestResult {
    const { symbol, totalCandles, windowSize, startingCapital,
            positionSizePct, stopLossPct, takeProfitPct } = config;

    const history  = generatePriceHistory(symbol, totalCandles);
    const trades:   BacktestTrade[]  = [];
    const curve:    DailySnapshot[]  = [];

    let cash        = startingCapital;
    let position:   OpenPosition | null = null;

    for (let day = windowSize; day < history.length; day++) {
      const candle  = history[day]!;
      const window  = history.slice(day - windowSize, day);
      const price   = candle.close;

      // ── Check exits before new signal ──────────────────────────────────────

      if (position !== null) {
        const exitReason = checkExit(price, position);

        if (exitReason !== null) {
          const trade = closeTrade(position, day, price, exitReason);
          cash += trade.quantity * price;
          trades.push(trade);
          position = null;
        }
      }

      // ── Compute signal ─────────────────────────────────────────────────────

      const technical = this.ta.analyze(window);
      const news      = neutralNews(candle);
      const decision  = this.engine.decide(technical, news);
      const signal    = decision.signal;

      // ── Execute signal ─────────────────────────────────────────────────────

      if (signal === Signal.BUY && position === null) {
        const tradeValue = cash * positionSizePct;
        const quantity   = tradeValue / price;
        cash            -= tradeValue;
        position         = {
          entryDay:        day,
          entryPrice:      price,
          quantity,
          stopLossPrice:   price * (1 - stopLossPct),
          takeProfitPrice: price * (1 + takeProfitPct),
        };
      } else if (signal === Signal.SELL && position !== null) {
        const trade = closeTrade(position, day, price, "SIGNAL");
        cash += trade.quantity * price;
        trades.push(trade);
        position = null;
      }

      // ── Record daily equity ────────────────────────────────────────────────

      const positionValue = position !== null ? position.quantity * price : 0;
      curve.push({ day, price, signal, equity: cash + positionValue, inPosition: position !== null });
    }

    // ── Close any open position at end of data ─────────────────────────────

    if (position !== null) {
      const lastCandle = history[history.length - 1]!;
      const exitPrice  = lastCandle.close;
      const trade      = closeTrade(position, history.length - 1, exitPrice, "END_OF_DATA");
      trades.push(trade);
    }

    return {
      config,
      trades,
      equityCurve: curve,
      metrics: computeMetrics(trades, curve, startingCapital),
    };
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function checkExit(price: number, pos: OpenPosition): ExitReason | null {
  if (price <= pos.stopLossPrice)   return "STOP_LOSS";
  if (price >= pos.takeProfitPrice) return "TAKE_PROFIT";
  return null;
}

function closeTrade(
  pos: OpenPosition,
  exitDay: number,
  exitPrice: number,
  exitReason: ExitReason,
): BacktestTrade {
  const pnl    = (exitPrice - pos.entryPrice) * pos.quantity;
  const pnlPct = ((exitPrice - pos.entryPrice) / pos.entryPrice) * 100;

  return {
    entryDay:   pos.entryDay,
    exitDay,
    entryPrice: parseFloat(pos.entryPrice.toFixed(4)),
    exitPrice:  parseFloat(exitPrice.toFixed(4)),
    quantity:   parseFloat(pos.quantity.toFixed(6)),
    signal:     Signal.BUY,   // backtest is long-only
    pnl:        parseFloat(pnl.toFixed(2)),
    pnlPct:     parseFloat(pnlPct.toFixed(2)),
    exitReason,
  };
}
