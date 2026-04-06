# Trading Bot — BYMA & CEDEARs

An autonomous trading signal system for Argentine equities (BYMA) and CEDEARs. It combines real-time market data, deterministic technical analysis, AI-powered news sentiment, and a Claude-based reasoning agent to produce structured BUY / SELL / HOLD decisions. All execution is **paper trading only** — no real orders are ever placed.

---

## How it works

The system runs a 7-step pipeline for each watched ticker:

```
Yahoo Finance → Technical Analysis → News Sentiment (Claude) → Agent Decision (Claude)
     ↓                ↓                       ↓                        ↓
 MarketData     RSI / EMA / MACD         Sentiment score          BUY/SELL/HOLD
                                                                        ↓
                                                              Risk Manager → Portfolio Validator → Paper Execution
```

### Step-by-step

| Step | What happens |
|------|-------------|
| **1. Market data** | Fetches real OHLCV prices from Yahoo Finance (`GGAL.BA`, `YPF.BA` for BYMA; US tickers for CEDEARs) |
| **2. Technical analysis** | Deterministic — computes RSI(14), EMA(20/50), MACD(12,26,9), and trend from 60-candle mock price history |
| **3. News analysis** | Claude (via Agent SDK) reads mock news headlines and returns a sentiment score and impact score |
| **4. Agent decision** | A Claude agent calls all three tools (market data, technical, news), reasons over the combined output, and returns a structured JSON decision with signal, confidence, and reasoning |
| **5. Risk profile** | Deterministic — sizes the position (max 10%), sets stop-loss (−3%) and take-profit (+8%) levels based on confidence |
| **6. Portfolio validation** | Deterministic — checks concentration limits (max 25% per asset, max 80% total exposure) |
| **7. Paper execution** | Simulates the trade in memory — tracks positions, unrealised P&L, and closed trades |

> **Claude never executes trades.** It only reasons and returns a structured decision. All execution logic is deterministic code.

---

## Architecture

```
src/
├── core/
│   ├── types.ts          — All domain types and enums (MarketData, Signal, TradingDecision, …)
│   └── interfaces.ts     — Port interfaces for every layer boundary
│
├── agents/
│   ├── masterTradingAgent.ts     — Main Claude agent (uses Agent SDK, calls 3 tools)
│   ├── newsAnalysisAgent.ts      — Claude agent for news sentiment
│   ├── tradingDecisionEngine.ts  — Deterministic fallback decision scorer
│   ├── technicalAnalysisAgent.ts — Pure math: EMA, RSI, MACD
│   ├── indicators.ts             — Low-level indicator functions
│   ├── agentPrompt.ts            — System prompt + user prompt builder
│   └── tools/                    — MCP tool definitions (market_data, technical_analysis, news_analysis)
│
├── services/
│   ├── marketDataService.ts      — IMarketDataProvider wrapper with error context
│   ├── technicalAnalysisService.ts
│   ├── newsService.ts
│   ├── riskManager.ts            — Position sizing and SL/TP calculation
│   ├── portfolioManager.ts       — Concentration and exposure rules
│   └── executionService.ts       — In-memory paper trading engine
│
├── infra/
│   ├── api/
│   │   └── yahooFinanceClient.ts — IMarketDataClient → yahoo-finance2 adapter
│   ├── config.ts                 — Environment variable loader and validator
│   ├── logger.ts                 — Structured JSON logger (LOG_PRETTY=true for dev)
│   ├── jsonStore.ts              — Generic append-only JSON file store
│   ├── decisionRepository.ts     — Persists TradingDecision to data/decisions.json
│   ├── tradeRepository.ts        — Persists trades to data/trades_*.json
│   └── marketDataRepository.ts   — Persists MarketData to data/market_data.json
│
├── orchestrator/
│   ├── orchestrator.ts   — Wires all 7 steps, runs one symbol through the pipeline
│   └── scheduler.ts      — setInterval loop with overlap guard and graceful shutdown
│
├── backtesting/
│   ├── backtestEngine.ts — Sliding-window replay (no LLM, neutral news stub)
│   ├── metrics.ts        — Sharpe ratio, drawdown, win rate, P&L stats
│   ├── runner.ts         — CLI script to run backtests
│   └── types.ts
│
└── index.ts              — Entry point: wires dependencies, starts scheduler

dashboard/                — Next.js 15 web dashboard (separate package)
├── app/
│   ├── page.tsx          — Server component entry
│   ├── layout.tsx
│   └── api/              — Route handlers (watchlist, analyze, snapshot, portfolio, history)
├── components/
│   ├── Dashboard.tsx     — Main client component with refresh loop
│   ├── WatchlistTable.tsx
│   ├── AnalysisPanel.tsx — Full analysis slide-over panel
│   ├── SearchBar.tsx
│   ├── PortfolioBar.tsx
│   └── HistoryTable.tsx
└── lib/
    ├── services.ts       — Singleton bot services shared across API routes
    └── watchlist.ts      — Watchlist persistence (data/watchlist.json)
```

---

## Requirements

- **Node.js** ≥ 18
- **Claude Pro subscription** — the Agent SDK uses your active browser session, no API key needed
- Internet access for Yahoo Finance quotes

---

## Installation

```bash
# 1. Install bot dependencies
npm install

# 2. Install dashboard dependencies
cd dashboard && npm install && cd ..
```

---

## Running

### Bot (scheduler)

Runs the full pipeline for all configured tickers on a timer.

```bash
# Minimal
TICKERS=GGAL,YPF npx tsx src/index.ts

# With readable logs and custom interval
TICKERS=GGAL,YPF,AAPL INTERVAL_MINUTES=30 LOG_LEVEL=debug LOG_PRETTY=true npx tsx src/index.ts
```

#### Environment variables

| Variable | Default | Description |
|----------|---------|-------------|
| `TICKERS` | *(empty)* | Comma-separated list of tickers to watch: `GGAL,YPF,AAPL` |
| `INTERVAL_MINUTES` | `15` | How often to run the pipeline |
| `LOG_LEVEL` | `info` | `debug` / `info` / `warn` / `error` |
| `LOG_PRETTY` | `false` | Set to `true` for human-readable colored output |

> BYMA tickers are fetched as `<TICKER>.BA` from Yahoo Finance (e.g. `GGAL` → `GGAL.BA`).  
> CEDEAR tickers use the US symbol directly (e.g. `AAPL`). Prices are returned in USD.

---

### Dashboard

```bash
cd dashboard
npm run dev
```

Open **http://localhost:3000**.

The dashboard connects to the same bot services and data files. It runs independently from the scheduler — you can use it without the scheduler running.

#### Dashboard features

- **Watchlist** — tracked tickers with live price, daily change %, last signal, confidence, RSI, and trend
- **On-demand analysis** — click ▶ on any row, or search any ticker and click Analyze, to run the full pipeline (including Claude) immediately
- **Analysis panel** — slide-over detail view with OHLCV, technical indicators, news sentiment, agent reasoning, risk profile, and paper execution result
- **Add to watchlist** — star button after analyzing any ticker; persisted to `data/watchlist.json`
- **Portfolio bar** — live paper trading stats: capital, cash, realized/unrealized P&L, open positions, closed trades
- **History** — last 30 decisions and closed trades
- **Auto-refresh** — prices and cached decisions refresh every 5 minutes without re-running Claude

---

### Backtesting

Runs the pipeline on simulated historical data (no LLM, no real prices — uses seeded mock candles).

```bash
npm run backtest
```

Output example:
```
────────────────────────────────────────────────────
 GGAL — 190 trading days
────────────────────────────────────────────────────
 Capital     $100,000 → $112,450
 Return      +12.45%
 Max Drwdwn  -4.21%
 Sharpe      1.83
 Trades      24  (16W / 8L — win rate 66.7%)
 Avg P&L     +0.52%
 Best trade  +7.98%   Worst: -2.87%
```

To configure the backtest symbols or parameters, edit `src/backtesting/runner.ts`.

---

## Data persistence

All data is stored as JSON files in `data/` (created automatically):

| File | Contents |
|------|----------|
| `data/decisions.json` | All trading decisions produced by the pipeline |
| `data/trades_executed.json` | Paper buy/sell orders |
| `data/trades_closed.json` | Closed positions with realized P&L |
| `data/market_data.json` | Snapshots captured during each pipeline run |
| `data/watchlist.json` | Dashboard watchlist (tickers + markets) |

---

## Key design decisions

**No API key required.** The Claude Agent SDK authenticates via your Claude Pro browser session. No `ANTHROPIC_API_KEY` is needed.

**Claude reasons, code decides.** The agent calls tools and produces a structured JSON recommendation. All risk management, portfolio validation, and execution are deterministic TypeScript — Claude cannot override them.

**Keyword fallback.** If the Claude session is unavailable, news sentiment falls back to a keyword-scoring algorithm so the pipeline never fully fails.

**Paper trading only.** The execution service simulates trades in memory. There is no integration with any broker or exchange.

**Ticker mapping.** BYMA stocks automatically get the `.BA` Yahoo Finance suffix. CEDEARs use the US ticker. The CCL exchange rate field (`cclRate`) is reserved for a future provider.
