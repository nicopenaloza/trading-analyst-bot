/**
 * MasterTradingAgent — uses Claude Agent SDK as the reasoning core.
 *
 * Claude calls three tools (market_data, technical_analysis, news_analysis),
 * synthesises the information, and returns a structured TradingDecision JSON.
 *
 * Claude MUST NOT execute trades. All execution happens outside this agent.
 */

import { createSdkMcpServer, query } from "@anthropic-ai/claude-agent-sdk";
import type { IMarketDataProvider, INewsProvider, ITechnicalAnalysisProvider } from "../core/interfaces.js";
import { DecisionReason, Signal } from "../core/types.js";
import type { TradingDecision, TradingSymbol } from "../core/types.js";
import { CLAUDE_MODEL } from "../infra/claudeClient.js";
import type { Logger } from "../infra/logger.js";
import { SYSTEM_PROMPT, buildUserPrompt } from "./agentPrompt.js";
import { buildTradingTools } from "./tools/index.js";

// ─── Response parsing ─────────────────────────────────────────────────────────

interface AgentResponse {
  signal: string;
  confidence: number;
  reason: string;
  reasoning: string;
}

function parseAgentResponse(raw: string): AgentResponse {
  const cleaned = raw.replace(/^```(?:json)?\s*/m, "").replace(/\s*```$/m, "").trim();
  const parsed  = JSON.parse(cleaned) as unknown;

  if (typeof parsed !== "object" || parsed === null) throw new Error("Response is not a JSON object");

  const v = parsed as Record<string, unknown>;

  if (!["BUY", "SELL", "HOLD"].includes(String(v["signal"]))) throw new Error(`Invalid signal: ${v["signal"]}`);
  if (typeof v["confidence"] !== "number")                     throw new Error("confidence must be a number");
  if (typeof v["reasoning"]  !== "string")                     throw new Error("reasoning must be a string");

  return {
    signal:     String(v["signal"]),
    confidence: Math.max(0, Math.min(0.89, Number(v["confidence"]))),
    reason:     String(v["reason"] ?? "COMBINED_ANALYSIS"),
    reasoning:  String(v["reasoning"]),
  };
}

function parseSignalString(s: string): Signal {
  if (s === "BUY")  return Signal.BUY;
  if (s === "SELL") return Signal.SELL;
  return Signal.HOLD;
}

function parseDecisionReason(s: string): DecisionReason {
  if (s in DecisionReason) return s as DecisionReason;
  return DecisionReason.COMBINED_ANALYSIS;
}

// ─── MasterTradingAgent ───────────────────────────────────────────────────────

const AGENT_NAME = "trading-analyst" as const;

export class MasterTradingAgent {
  constructor(
    private readonly marketDataProvider: IMarketDataProvider,
    private readonly technicalProvider: ITechnicalAnalysisProvider,
    private readonly newsProvider: INewsProvider,
    private readonly logger: Logger,
  ) {}

  async analyze(
    symbol: TradingSymbol,
    technicalAnalysis: Awaited<ReturnType<ITechnicalAnalysisProvider["getAnalysis"]>>,
    newsAnalysis: Awaited<ReturnType<INewsProvider["getAnalysis"]>>,
  ): Promise<TradingDecision> {
    this.logger.debug("Agent query start", { ticker: symbol.ticker });

    const tools     = buildTradingTools(symbol, this.marketDataProvider, this.technicalProvider, this.newsProvider);
    const mcpServer = createSdkMcpServer({ name: "trading-tools", tools: [...tools] });

    const stream = query({
      prompt: buildUserPrompt(symbol),
      options: {
        // Attach system prompt via named agent definition
        agent:  AGENT_NAME,
        agents: {
          [AGENT_NAME]: {
            description: "Quantitative analyst for BYMA and CEDEAR markets",
            prompt:      SYSTEM_PROMPT,
            model:       CLAUDE_MODEL,
          },
        },
        mcpServers:                      { "trading-tools": mcpServer },
        tools:                           [],
        permissionMode:                  "bypassPermissions",
        allowDangerouslySkipPermissions: true,
        persistSession:                  false,
        maxTurns:                        10,
      },
    });

    let resultText = "";

    for await (const message of stream) {
      if (message.type === "result") {
        if (message.subtype === "success") {
          resultText = message.result;
        } else {
          throw new Error(`Agent SDK error: ${message.subtype}`);
        }
      }
    }

    if (!resultText) throw new Error("Agent returned no result");

    this.logger.debug("Agent raw response", {
      ticker: symbol.ticker,
      preview: resultText.slice(0, 300),
    });

    let parsed: ReturnType<typeof parseAgentResponse>;
    try {
      parsed = parseAgentResponse(resultText);
    } catch (err) {
      this.logger.error("Agent response parse failed", {
        ticker: symbol.ticker,
        err:    String(err),
        raw:    resultText,
      });
      throw err;
    }

    return {
      symbol,
      signal:            parseSignalString(parsed.signal),
      confidence:        parsed.confidence,
      reason:            parseDecisionReason(parsed.reason),
      reasoning:         parsed.reasoning,
      technicalAnalysis,
      newsAnalysis,
      generatedAt:       new Date(),
    };
  }
}
