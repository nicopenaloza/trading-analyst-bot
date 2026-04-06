// TradingDecisionEngine — deterministic, no LLM.
// Combines TechnicalAnalysis + NewsAnalysis into a scored TradingDecision.

import {
  DecisionReason,
  Signal,
  Trend,
} from "../core/types.js";
import type {
  NewsAnalysis,
  TechnicalAnalysis,
  TradingDecision,
} from "../core/types.js";

// ─── Weights ──────────────────────────────────────────────────────────────────

const WEIGHT = {
  // Technical sub-signals (must sum to 1)
  rsi:   0.25,
  ema:   0.35,
  macd:  0.25,
  trend: 0.15,
  // Layer mix (must sum to 1)
  technical: 0.70,
  news:      0.30,
} as const;

// ─── Thresholds ───────────────────────────────────────────────────────────────

const SIGNAL_THRESHOLD  = 0.20; // |score| above this → BUY or SELL
const CONFIDENCE_CLAMP  = 0.80; // cap confidence at 80% for deterministic model

// ─── Technical sub-signals ───────────────────────────────────────────────────

/** Maps RSI value to a [-1, 1] score. */
function rsiScore(rsi: number): number {
  if (rsi < 30) return  1.0;   // oversold
  if (rsi < 40) return  0.5;
  if (rsi < 45) return  0.2;
  if (rsi <= 55) return 0.0;   // neutral band
  if (rsi <= 60) return -0.2;
  if (rsi <= 70) return -0.5;
  return -1.0;                  // overbought
}

/** Golden/death cross: EMA20 vs EMA50. */
function emaScore(ema20: number, ema50: number): number {
  const spread = (ema20 - ema50) / ema50;
  if (spread >  0.02) return  1.0;
  if (spread >  0.00) return  0.4;
  if (spread > -0.02) return -0.4;
  return -1.0;
}

/** MACD histogram direction and line position. */
function macdScore(value: number, histogram: number): number {
  const sign = (n: number) => (n > 0 ? 1 : n < 0 ? -1 : 0);
  // Both line and histogram agree → full signal; split → partial
  const lineSign = sign(value);
  const histSign = sign(histogram);
  if (lineSign === histSign) return lineSign * 1.0;
  if (histSign !== 0)        return histSign * 0.4; // histogram leads
  return 0;
}

/** Trend enum → score. */
function trendScore(trend: Trend): number {
  switch (trend) {
    case Trend.BULLISH: return  1.0;
    case Trend.BEARISH: return -1.0;
    case Trend.NEUTRAL: return  0.0;
  }
}

// ─── Aggregate scores ─────────────────────────────────────────────────────────

function technicalScore(ta: TechnicalAnalysis): number {
  return (
    rsiScore(ta.rsi)                      * WEIGHT.rsi  +
    emaScore(ta.ema20, ta.ema50)           * WEIGHT.ema  +
    macdScore(ta.macd.value, ta.macd.histogram) * WEIGHT.macd +
    trendScore(ta.trend)                   * WEIGHT.trend
  );
}

/**
 * News score = sentimentScore × impactScore.
 * Low-impact news has little influence regardless of sentiment.
 */
function calculateNewsScore(na: NewsAnalysis): number {
  return na.sentimentScore * na.impactScore;
}

// ─── Reason classifier ────────────────────────────────────────────────────────

function classifyReason(
  techScore: number,
  newsScore: number,
  finalScore: number,
): DecisionReason {
  const techContrib = Math.abs(techScore * WEIGHT.technical);
  const newsContrib = Math.abs(newsScore * WEIGHT.news);

  if (Math.abs(finalScore) < SIGNAL_THRESHOLD) return DecisionReason.INSUFFICIENT_DATA;

  const sameDirection =
    Math.sign(techScore) === Math.sign(newsScore) && newsScore !== 0;

  if (sameDirection)            return DecisionReason.COMBINED_ANALYSIS;
  if (newsContrib > techContrib) return DecisionReason.NEWS_CATALYST;
  return DecisionReason.TECHNICAL_SIGNAL;
}

// ─── Reasoning string ─────────────────────────────────────────────────────────

function buildReasoning(
  ta: TechnicalAnalysis,
  na: NewsAnalysis,
  techScore: number,
  newsScore: number,
  finalScore: number,
  signal: Signal,
): string {
  const lines = [
    `Signal: ${signal} (score ${finalScore.toFixed(3)})`,
    `Technical (${(WEIGHT.technical * 100).toFixed(0)}%): score=${techScore.toFixed(3)} | RSI=${ta.rsi.toFixed(1)}, EMA20=${ta.ema20.toFixed(2)} vs EMA50=${ta.ema50.toFixed(2)}, MACD hist=${ta.macd.histogram.toFixed(4)}, Trend=${ta.trend}`,
    `News (${(WEIGHT.news * 100).toFixed(0)}%): score=${newsScore.toFixed(3)} | sentiment=${na.overallSentiment} (${na.sentimentScore.toFixed(2)}), impact=${na.impactScore.toFixed(2)}`,
  ];
  return lines.join(" | ");
}

// ─── Engine ───────────────────────────────────────────────────────────────────

export class TradingDecisionEngine {
  decide(
    technicalAnalysis: TechnicalAnalysis,
    newsAnalysis: NewsAnalysis,
  ): TradingDecision {
    const techScore  = technicalScore(technicalAnalysis);
    const newsScore  = calculateNewsScore(newsAnalysis);
    const finalScore = techScore * WEIGHT.technical + newsScore * WEIGHT.news;

    const signal = scoreToSignal(finalScore);
    const confidence = Math.min(Math.abs(finalScore), CONFIDENCE_CLAMP);
    const reason = classifyReason(techScore, newsScore, finalScore);
    const reasoning = buildReasoning(
      technicalAnalysis,
      newsAnalysis,
      techScore,
      newsScore,
      finalScore,
      signal,
    );

    return {
      symbol:            technicalAnalysis.symbol,
      signal,
      confidence,
      reason,
      reasoning,
      technicalAnalysis,
      newsAnalysis,
      generatedAt:       new Date(),
    };
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function scoreToSignal(score: number): Signal {
  if (score >=  SIGNAL_THRESHOLD) return Signal.BUY;
  if (score <= -SIGNAL_THRESHOLD) return Signal.SELL;
  return Signal.HOLD;
}
