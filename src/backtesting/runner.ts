// Standalone backtest runner — execute with: npx tsx src/backtesting/runner.ts

import { Market } from "../core/types.js";
import { BacktestEngine } from "./backtestEngine.js";
import type { BacktestConfig } from "./types.js";

const engine = new BacktestEngine();

const configs: BacktestConfig[] = [
  {
    symbol:          { ticker: "GGAL", market: Market.BYMA },
    totalCandles:    250,
    windowSize:      60,
    startingCapital: 100_000,
    positionSizePct: 0.10,
    stopLossPct:     0.03,
    takeProfitPct:   0.08,
  },
  {
    symbol:          { ticker: "YPF", market: Market.BYMA },
    totalCandles:    250,
    windowSize:      60,
    startingCapital: 100_000,
    positionSizePct: 0.10,
    stopLossPct:     0.03,
    takeProfitPct:   0.08,
  },
  {
    symbol:          { ticker: "AAPL", market: Market.CEDEAR },
    totalCandles:    250,
    windowSize:      60,
    startingCapital: 100_000,
    positionSizePct: 0.10,
    stopLossPct:     0.03,
    takeProfitPct:   0.08,
  },
];

for (const config of configs) {
  const result  = engine.run(config);
  const { metrics: m, trades } = result;
  const ticker  = config.symbol.ticker;

  console.log(`\n${"─".repeat(52)}`);
  console.log(` ${ticker} — ${config.totalCandles - config.windowSize} trading days`);
  console.log(`${"─".repeat(52)}`);

  console.log(` Capital     $${m.startingCapital.toLocaleString()} → $${m.finalCapital.toLocaleString()}`);
  console.log(` Return      ${m.totalReturnPct >= 0 ? "+" : ""}${m.totalReturnPct}%`);
  console.log(` Max Drwdwn  ${m.maxDrawdownPct}%`);
  console.log(` Sharpe      ${m.sharpeRatio}`);
  console.log(` Trades      ${m.totalTrades}  (${m.winningTrades}W / ${m.losingTrades}L — win rate ${m.winRatePct}%)`);
  console.log(` Avg P&L     ${m.avgPnlPct >= 0 ? "+" : ""}${m.avgPnlPct}%`);
  console.log(` Best trade  +${m.bestTradePct}%   Worst: ${m.worstTradePct}%`);

  if (trades.length > 0) {
    console.log(`\n Trade log:`);
    for (const t of trades) {
      const sign = t.pnl >= 0 ? "+" : "";
      console.log(`   day ${String(t.entryDay).padStart(3)}→${String(t.exitDay).padStart(3)}  ${t.exitReason.padEnd(12)} ${sign}${t.pnlPct}%  ($${sign}${t.pnl})`);
    }
  }
}
