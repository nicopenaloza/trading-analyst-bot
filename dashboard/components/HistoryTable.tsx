"use client";

import type { TradingDecision, ClosedTrade } from "@bot/core/types.js";
import { Signal } from "@bot/core/types.js";

interface Props {
  history: { decisions: TradingDecision[]; closedTrades: ClosedTrade[] } | null;
}

export default function HistoryTable({ history }: Props) {
  if (!history) return null;

  const { decisions, closedTrades } = history;
  if (decisions.length === 0 && closedTrades.length === 0) return null;

  return (
    <div className="space-y-4">
      {/* Decisions */}
      {decisions.length > 0 && (
        <div className="rounded-xl border border-[#1f2d42] bg-[#0f1623] overflow-hidden">
          <div className="px-4 py-3 border-b border-[#1f2d42]">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Historial de Decisiones</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-[10px] text-slate-600 uppercase tracking-wider border-b border-[#1f2d42]">
                  <th className="px-4 py-2 text-left">Fecha</th>
                  <th className="px-4 py-2 text-left">Ticker</th>
                  <th className="px-4 py-2 text-left">Señal</th>
                  <th className="px-4 py-2 text-right">Confianza</th>
                  <th className="px-4 py-2 text-left">Razón</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1f2d42]/40">
                {decisions.map((d, i) => (
                  <tr key={i} className="hover:bg-[#161e2e]/40 transition-colors">
                    <td className="px-4 py-2 font-mono text-slate-500">{formatDate(d.generatedAt)}</td>
                    <td className="px-4 py-2 font-mono font-medium text-slate-200">{d.symbol.ticker}</td>
                    <td className="px-4 py-2"><SignalPill signal={d.signal} /></td>
                    <td className="px-4 py-2 text-right font-mono text-slate-300">{d.confidence.toFixed(2)}</td>
                    <td className="px-4 py-2 text-slate-500">{d.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Closed trades */}
      {closedTrades.length > 0 && (
        <div className="rounded-xl border border-[#1f2d42] bg-[#0f1623] overflow-hidden">
          <div className="px-4 py-3 border-b border-[#1f2d42]">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Trades Cerrados</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-[10px] text-slate-600 uppercase tracking-wider border-b border-[#1f2d42]">
                  <th className="px-4 py-2 text-left">Ticker</th>
                  <th className="px-4 py-2 text-right">Entrada</th>
                  <th className="px-4 py-2 text-right">Salida</th>
                  <th className="px-4 py-2 text-right">P&L</th>
                  <th className="px-4 py-2 text-left">Motivo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1f2d42]/40">
                {closedTrades.map((t, i) => {
                  const pos = t.realizedPnL >= 0;
                  return (
                    <tr key={i} className="hover:bg-[#161e2e]/40 transition-colors">
                      <td className="px-4 py-2 font-mono font-medium text-slate-200">{t.symbol.ticker}</td>
                      <td className="px-4 py-2 text-right font-mono text-slate-300">${t.entryTrade.price.toLocaleString()}</td>
                      <td className="px-4 py-2 text-right font-mono text-slate-300">${t.exitTrade.price.toLocaleString()}</td>
                      <td className={`px-4 py-2 text-right font-mono ${pos ? "text-emerald-400" : "text-red-400"}`}>
                        {pos ? "+" : ""}{(t.realizedPnLPercent * 100).toFixed(2)}%
                      </td>
                      <td className="px-4 py-2 text-slate-500">{t.exitReason}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function SignalPill({ signal }: { signal: Signal }) {
  const styles = {
    [Signal.BUY]:  "text-emerald-400",
    [Signal.SELL]: "text-red-400",
    [Signal.HOLD]: "text-amber-400",
  };
  return <span className={`font-semibold ${styles[signal]}`}>{signal}</span>;
}

function formatDate(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleString("es-AR", {
    month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit",
  });
}
