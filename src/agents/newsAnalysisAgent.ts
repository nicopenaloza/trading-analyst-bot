import { query } from "@anthropic-ai/claude-agent-sdk";
import { Sentiment } from "../core/types.js";
import type { NewsAnalysis, NewsItem, TradingSymbol } from "../core/types.js";
import { CLAUDE_MODEL } from "../infra/claudeClient.js";
import type { Logger } from "../infra/logger.js";

// ─── Claude response schema ───────────────────────────────────────────────────

interface ClaudeNewsResponse {
  sentiment: "POSITIVE" | "NEGATIVE" | "NEUTRAL";
  sentimentScore: number;
  impactScore: number;
  summary: string;
}

// ─── Prompt ───────────────────────────────────────────────────────────────────

export function buildNewsPrompt(symbol: TradingSymbol, items: NewsItem[]): string {
  const headlines = items
    .map((item, i) => `${i + 1}. [${item.source}] ${item.headline}\n   ${item.summary}`)
    .join("\n\n");

  return `You are a financial analyst specializing in ${symbol.market} markets.

Analyze the following news items for the ticker ${symbol.ticker} and respond with ONLY a JSON object — no markdown, no explanation.

Required fields:
- "sentiment": one of "POSITIVE", "NEGATIVE", or "NEUTRAL"
- "sentimentScore": float from -1.0 (very negative) to 1.0 (very positive)
- "impactScore": float from 0.0 (noise) to 1.0 (highly market-moving)
- "summary": one paragraph synthesizing the news, written in the same language as the headlines

News items:
${headlines}`;
}

// ─── Agent SDK call + parse ───────────────────────────────────────────────────

async function callAgentSdk(prompt: string): Promise<ClaudeNewsResponse> {
  const stream = query({
    prompt,
    options: {
      tools:                           [],
      permissionMode:                  "bypassPermissions",
      allowDangerouslySkipPermissions: true,
      persistSession:                  false,
      maxTurns:                        3,
      model:                           CLAUDE_MODEL,
    },
  });

  for await (const message of stream) {
    if (message.type === "result") {
      if (message.subtype !== "success") {
        throw new Error(`Agent SDK error: ${message.subtype}`);
      }

      const raw     = message.result.replace(/^```(?:json)?\s*/m, "").replace(/\s*```$/m, "").trim();
      const parsed  = JSON.parse(raw) as unknown;

      if (!isClaudeNewsResponse(parsed)) {
        throw new Error(`Response failed validation: ${raw}`);
      }

      return parsed;
    }
  }

  throw new Error("Agent SDK returned no result message");
}

function isClaudeNewsResponse(value: unknown): value is ClaudeNewsResponse {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    (v["sentiment"] === "POSITIVE" || v["sentiment"] === "NEGATIVE" || v["sentiment"] === "NEUTRAL") &&
    typeof v["sentimentScore"] === "number" &&
    typeof v["impactScore"]    === "number" &&
    typeof v["summary"]        === "string"
  );
}

// ─── Keyword fallback (used when SDK is unavailable) ─────────────────────────

const POSITIVE_KEYWORDS = [
  "récord", "record", "suba", "surge", "rally", "beat", "strong", "profit",
  "growth", "utilidades", "inversión", "acuerdo", "expands", "supera",
  "solidez", "acceleration",
];

const NEGATIVE_KEYWORDS = [
  "caída", "cae", "baja", "loss", "decline", "miss", "weak", "morosidad",
  "restricción", "conflicto", "paro", "scrutiny", "antitrust", "presión",
  "incertidumbre", "cautela",
];

const HIGH_IMPACT_KEYWORDS = [
  "récord", "record", "acuerdo", "agreement", "inversión", "antitrust",
  "investigation", "beat", "supera", "surge", "caída", "conflicto",
];

function keywordFallback(symbol: TradingSymbol, items: NewsItem[]): ClaudeNewsResponse {
  const scores = items.map((item) => {
    const text  = `${item.headline} ${item.summary}`.toLowerCase();
    const pos   = POSITIVE_KEYWORDS.filter((w) => text.includes(w)).length;
    const neg   = NEGATIVE_KEYWORDS.filter((w) => text.includes(w)).length;
    const imp   = HIGH_IMPACT_KEYWORDS.filter((w) => text.includes(w)).length;
    const total = pos + neg;
    return { sentiment: total === 0 ? 0 : (pos - neg) / total, impact: Math.min(imp / 3, 1) };
  });

  const sentimentScore = Math.max(-1, Math.min(1, scores.reduce((a, s) => a + s.sentiment, 0) / scores.length));
  const impactScore    = Math.max(0,  Math.min(1, scores.reduce((a, s) => a + s.impact,    0) / scores.length));
  const sentiment: ClaudeNewsResponse["sentiment"] =
    sentimentScore > 0.15 ? "POSITIVE" : sentimentScore < -0.15 ? "NEGATIVE" : "NEUTRAL";

  return {
    sentiment,
    sentimentScore,
    impactScore,
    summary: `[keyword fallback] ${items.length} items for ${symbol.ticker} — ${sentiment}. ${items.map((i) => i.headline).join("; ")}.`,
  };
}

// ─── Agent ────────────────────────────────────────────────────────────────────

export class NewsAnalysisAgent {
  constructor(private readonly logger?: Logger) {}

  async analyze(symbol: TradingSymbol, items: NewsItem[]): Promise<NewsAnalysis> {
    if (items.length === 0) return emptyAnalysis(symbol);

    const prompt = buildNewsPrompt(symbol, items);
    let response: ClaudeNewsResponse;

    try {
      response = await callAgentSdk(prompt);
    } catch (err) {
      this.logger?.warn("News LLM failed — using keyword fallback", {
        ticker: symbol.ticker,
        err:    String(err),
      });
      response = keywordFallback(symbol, items);
    }

    return {
      symbol,
      items,
      overallSentiment: Sentiment[response.sentiment],
      sentimentScore:   Math.max(-1, Math.min(1, response.sentimentScore)),
      impactScore:      Math.max(0,  Math.min(1, response.impactScore)),
      summary:          response.summary,
      analyzedAt:       new Date(),
    };
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function emptyAnalysis(symbol: TradingSymbol): NewsAnalysis {
  return {
    symbol,
    items:            [],
    overallSentiment: Sentiment.NEUTRAL,
    sentimentScore:   0,
    impactScore:      0,
    summary:          `No recent news found for ${symbol.ticker}.`,
    analyzedAt:       new Date(),
  };
}
