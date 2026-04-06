import { tool } from "@anthropic-ai/claude-agent-sdk";
import { z } from "zod/v4";
import type { INewsProvider } from "../../core/interfaces.js";
import type { NewsAnalysis, TradingSymbol } from "../../core/types.js";
import { okResponse, errResponse } from "./toolResponse.js";

// ─── Input schema ─────────────────────────────────────────────────────────────

const inputSchema = {
  ticker: z.string().describe("Ticker symbol"),
  market: z.enum(["BYMA", "CEDEAR"]).describe("Exchange"),
};

// ─── Output enrichment ────────────────────────────────────────────────────────

function interpretSentimentScore(score: number): string {
  if (score >=  0.6) return "Strongly positive — likely bullish catalyst";
  if (score >=  0.2) return "Mildly positive — slight tailwind";
  if (score >  -0.2) return "Neutral — no material news impact";
  if (score >  -0.6) return "Mildly negative — slight headwind";
  return "Strongly negative — likely bearish catalyst";
}

function interpretImpactScore(score: number): string {
  if (score >= 0.7) return "High impact — market-moving news";
  if (score >= 0.4) return "Medium impact — notable but not decisive";
  return "Low impact — background noise";
}

function buildOutput(analysis: NewsAnalysis) {
  return {
    ticker:  analysis.symbol.ticker,
    market:  analysis.symbol.market,
    sentiment: {
      overall:        analysis.overallSentiment,
      score:          parseFloat(analysis.sentimentScore.toFixed(3)),
      interpretation: interpretSentimentScore(analysis.sentimentScore),
    },
    impact: {
      score:          parseFloat(analysis.impactScore.toFixed(3)),
      interpretation: interpretImpactScore(analysis.impactScore),
    },
    summary:   analysis.summary,
    itemCount: analysis.items.length,
    headlines: analysis.items.map((item) => ({
      source:      item.source,
      headline:    item.headline,
      publishedAt: item.publishedAt,
    })),
    analyzedAt: analysis.analyzedAt,
  };
}

// ─── Tool ─────────────────────────────────────────────────────────────────────

export function createNewsAnalysisTool(
  provider: INewsProvider,
  symbol: TradingSymbol,
) {
  return tool(
    "news_analysis",
    `Retrieve and analyse recent news for a symbol.
Returns overall sentiment (POSITIVE/NEGATIVE/NEUTRAL), a sentiment score (-1 to +1),
an impact score (0 to 1), a summary paragraph, and the raw headlines.
Each score includes a plain-language interpretation.`,
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
