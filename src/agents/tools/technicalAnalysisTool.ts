import { tool } from "@anthropic-ai/claude-agent-sdk";
import { z } from "zod/v4";
import type { ITechnicalAnalysisProvider } from "../../core/interfaces.js";
import type { TechnicalAnalysis, TradingSymbol } from "../../core/types.js";
import { Trend } from "../../core/types.js";
import { okResponse, errResponse } from "./toolResponse.js";

// ─── Input schema ─────────────────────────────────────────────────────────────

const inputSchema = {
  ticker: z.string().describe("Ticker symbol"),
  market: z.enum(["BYMA", "CEDEAR"]).describe("Exchange"),
};

// ─── Deterministic interpretations ───────────────────────────────────────────

function interpretRsi(rsi: number): string {
  if (rsi < 30)  return "Oversold — potential reversal upward";
  if (rsi < 45)  return "Weakening — mild bearish pressure";
  if (rsi <= 55) return "Neutral — no clear momentum";
  if (rsi <= 70) return "Strengthening — mild bullish pressure";
  return "Overbought — potential reversal downward";
}

function interpretEmaCross(ema20: number, ema50: number): string {
  const spread = ((ema20 - ema50) / ema50) * 100;
  if (spread >  2)  return `Golden cross — EMA20 is ${spread.toFixed(1)}% above EMA50 (bullish)`;
  if (spread >  0)  return `Slight bullish — EMA20 marginally above EMA50 (+${spread.toFixed(1)}%)`;
  if (spread > -2)  return `Slight bearish — EMA20 marginally below EMA50 (${spread.toFixed(1)}%)`;
  return `Death cross — EMA20 is ${Math.abs(spread).toFixed(1)}% below EMA50 (bearish)`;
}

function interpretMacd(value: number, signal: number, histogram: number): string {
  const crossover = value > signal ? "MACD above signal" : "MACD below signal";
  const momentum  = histogram > 0 ? "positive histogram (gaining momentum)" : "negative histogram (losing momentum)";
  const direction = value > 0 ? "above zero line (bullish territory)" : "below zero line (bearish territory)";
  return `${crossover}, ${momentum}, ${direction}`;
}

// ─── Output enrichment ────────────────────────────────────────────────────────

function buildOutput(analysis: TechnicalAnalysis) {
  return {
    ticker:  analysis.symbol.ticker,
    market:  analysis.symbol.market,
    indicators: {
      rsi: {
        value:          parseFloat(analysis.rsi.toFixed(2)),
        interpretation: interpretRsi(analysis.rsi),
      },
      ema: {
        ema20:          parseFloat(analysis.ema20.toFixed(4)),
        ema50:          parseFloat(analysis.ema50.toFixed(4)),
        interpretation: interpretEmaCross(analysis.ema20, analysis.ema50),
      },
      macd: {
        value:          parseFloat(analysis.macd.value.toFixed(4)),
        signal:         parseFloat(analysis.macd.signal.toFixed(4)),
        histogram:      parseFloat(analysis.macd.histogram.toFixed(4)),
        interpretation: interpretMacd(analysis.macd.value, analysis.macd.signal, analysis.macd.histogram),
      },
    },
    trend: {
      value:          analysis.trend,
      interpretation: analysis.trend === Trend.BULLISH
        ? "All indicators aligned bullish"
        : analysis.trend === Trend.BEARISH
          ? "All indicators aligned bearish"
          : "Mixed signals — no clear trend",
    },
    calculatedAt: analysis.calculatedAt,
  };
}

// ─── Tool ─────────────────────────────────────────────────────────────────────

export function createTechnicalAnalysisTool(
  provider: ITechnicalAnalysisProvider,
  symbol: TradingSymbol,
) {
  return tool(
    "technical_analysis",
    `Compute technical indicators from the last 60 daily candles.
Returns RSI(14), EMA20, EMA50, MACD(12,26,9), and overall trend.
Each indicator includes a plain-language interpretation.
This tool is deterministic — same input always produces the same output.`,
    inputSchema,
    async (_args) => {
      try {
        const analysis = await provider.getAnalysis(symbol);
        return okResponse(buildOutput(analysis));
      } catch (err) {
        return errResponse(err);
      }
    },
  );
}
