import type { BacktestTrade, DailySnapshot, PerformanceMetrics } from "./types.js";

export function computeMetrics(
  trades: BacktestTrade[],
  equityCurve: DailySnapshot[],
  startingCapital: number,
): PerformanceMetrics {
  const finalCapital    = equityCurve[equityCurve.length - 1]?.equity ?? startingCapital;
  const totalReturnPct  = ((finalCapital - startingCapital) / startingCapital) * 100;

  // ── Trade stats ────────────────────────────────────────────────────────────

  const winningTrades   = trades.filter((t) => t.pnl > 0).length;
  const losingTrades    = trades.filter((t) => t.pnl <= 0).length;
  const winRatePct      = trades.length === 0 ? 0 : (winningTrades / trades.length) * 100;
  const avgPnlPct       = trades.length === 0 ? 0 : trades.reduce((s, t) => s + t.pnlPct, 0) / trades.length;
  const bestTradePct    = trades.length === 0 ? 0 : Math.max(...trades.map((t) => t.pnlPct));
  const worstTradePct   = trades.length === 0 ? 0 : Math.min(...trades.map((t) => t.pnlPct));

  // ── Max drawdown ────────────────────────────────────────────────────────────

  let peak         = startingCapital;
  let maxDrawdown  = 0;

  for (const snap of equityCurve) {
    if (snap.equity > peak) peak = snap.equity;
    const drawdown = (peak - snap.equity) / peak;
    if (drawdown > maxDrawdown) maxDrawdown = drawdown;
  }

  // ── Sharpe ratio (annualised, risk-free rate = 0) ──────────────────────────

  const dailyReturns: number[] = [];
  for (let i = 1; i < equityCurve.length; i++) {
    const prev = equityCurve[i - 1]!.equity;
    const curr = equityCurve[i]!.equity;
    dailyReturns.push((curr - prev) / prev);
  }

  const sharpeRatio = computeSharpe(dailyReturns);

  return {
    startingCapital,
    finalCapital:   parseFloat(finalCapital.toFixed(2)),
    totalReturnPct: parseFloat(totalReturnPct.toFixed(2)),
    totalTrades:    trades.length,
    winningTrades,
    losingTrades,
    winRatePct:     parseFloat(winRatePct.toFixed(1)),
    avgPnlPct:      parseFloat(avgPnlPct.toFixed(2)),
    bestTradePct:   parseFloat(bestTradePct.toFixed(2)),
    worstTradePct:  parseFloat(worstTradePct.toFixed(2)),
    maxDrawdownPct: parseFloat((maxDrawdown * 100).toFixed(2)),
    sharpeRatio:    parseFloat(sharpeRatio.toFixed(2)),
    totalDays:      equityCurve.length,
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function computeSharpe(dailyReturns: number[]): number {
  if (dailyReturns.length < 2) return 0;

  const mean = dailyReturns.reduce((s, r) => s + r, 0) / dailyReturns.length;
  const variance = dailyReturns.reduce((s, r) => s + (r - mean) ** 2, 0) / (dailyReturns.length - 1);
  const stdDev = Math.sqrt(variance);

  if (stdDev === 0) return 0;

  // Annualise: multiply daily Sharpe by √252
  return (mean / stdDev) * Math.sqrt(252);
}
