"use client";

import { Loader2, Play, Trash2, TrendingUp, TrendingDown, Minus } from "lucide-react";
import type { TickerSnapshot } from "@/app/api/snapshot/route";
import { Signal, Trend } from "@bot/core/types.js";

interface Props {
  snapshots:     TickerSnapshot[];
  loadingTicker: string | null;
  onAnalyze:     (ticker: string, market: string) => void;
  onRemove:      (ticker: string) => void;
  onSelect:      (snap: TickerSnapshot) => void;
}

export default function WatchlistTable({ snapshots, loadingTicker, onAnalyze, onRemove, onSelect }: Props) {
  if (snapshots.length === 0) {
    return (
      <div className="rounded-xl border border-[#1f2d42] bg-[#0f1623] p-8 text-center text-sm text-slate-500">
        Tu watchlist está vacía. Buscá un ticker y hacé click en "Agregar watchlist".
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[#1f2d42] bg-[#0f1623] overflow-hidden">
      <div className="px-4 py-3 border-b border-[#1f2d42] flex items-center justify-between">
        <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Watchlist</span>
        <span className="text-xs text-slate-600">{snapshots.length} tickers</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-slate-500 uppercase tracking-wider border-b border-[#1f2d42]">
              <Th>Ticker</Th>
              <Th align="right">Precio</Th>
              <Th align="right">Cambio</Th>
              <Th>Señal</Th>
              <Th align="right">Confianza</Th>
              <Th align="right">RSI</Th>
              <Th>Tendencia</Th>
              <Th />
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1f2d42]/50">
            {snapshots.map((snap) => (
              <Row
                key={snap.ticker}
                snap={snap}
                loading={loadingTicker === snap.ticker}
                onAnalyze={() => onAnalyze(snap.ticker, snap.market)}
                onRemove={() => onRemove(snap.ticker)}
                onSelect={() => onSelect(snap)}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Row({
  snap, loading, onAnalyze, onRemove, onSelect,
}: {
  snap: TickerSnapshot;
  loading: boolean;
  onAnalyze: () => void;
  onRemove: () => void;
  onSelect: () => void;
}) {
  const md  = snap.marketData;
  const dec = snap.lastDecision;

  return (
    <tr
      className="hover:bg-[#161e2e]/60 cursor-pointer transition-colors group"
      onClick={onSelect}
    >
      {/* Ticker + market */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="font-mono font-semibold text-slate-100">{snap.ticker}</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded border border-[#1f2d42] text-slate-500">
            {snap.market}
          </span>
        </div>
      </td>

      {/* Price */}
      <td className="px-4 py-3 text-right font-mono text-slate-200">
        {md ? formatPrice(md.close) : snap.error ? <span className="text-red-400 text-xs">error</span> : "—"}
      </td>

      {/* Change % */}
      <td className="px-4 py-3 text-right font-mono">
        {snap.changePercent != null ? (
          <span className={snap.changePercent >= 0 ? "text-emerald-400" : "text-red-400"}>
            {snap.changePercent >= 0 ? "+" : ""}{snap.changePercent.toFixed(2)}%
          </span>
        ) : "—"}
      </td>

      {/* Signal */}
      <td className="px-4 py-3">
        {dec ? <SignalBadge signal={dec.signal} /> : <span className="text-slate-600 text-xs">sin análisis</span>}
      </td>

      {/* Confidence */}
      <td className="px-4 py-3 text-right font-mono text-slate-300">
        {dec ? dec.confidence.toFixed(2) : "—"}
      </td>

      {/* RSI */}
      <td className="px-4 py-3 text-right font-mono">
        {dec ? <RsiValue rsi={dec.technicalAnalysis.rsi} /> : "—"}
      </td>

      {/* Trend */}
      <td className="px-4 py-3">
        {dec ? <TrendIcon trend={dec.technicalAnalysis.trend} /> : "—"}
      </td>

      {/* Actions */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-1 justify-end" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={onAnalyze}
            disabled={loading}
            title="Analizar"
            className="p-1.5 rounded hover:bg-indigo-500/20 text-slate-500 hover:text-indigo-400 transition-colors disabled:opacity-40"
          >
            {loading ? <Loader2 size={13} className="animate-spin" /> : <Play size={13} />}
          </button>
          <button
            onClick={onRemove}
            title="Eliminar"
            className="p-1.5 rounded hover:bg-red-500/20 text-slate-600 hover:text-red-400 transition-colors"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </td>
    </tr>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Th({ children, align = "left" }: { children?: React.ReactNode; align?: "left" | "right" }) {
  return (
    <th className={`px-4 py-2.5 font-medium text-${align} whitespace-nowrap`}>
      {children}
    </th>
  );
}

function SignalBadge({ signal }: { signal: Signal }) {
  const styles = {
    [Signal.BUY]:  "bg-emerald-400/10 text-emerald-400 border-emerald-400/20",
    [Signal.SELL]: "bg-red-400/10     text-red-400     border-red-400/20",
    [Signal.HOLD]: "bg-amber-400/10   text-amber-400   border-amber-400/20",
  };
  return (
    <span className={`inline-flex px-2 py-0.5 rounded text-xs font-semibold border ${styles[signal]}`}>
      {signal}
    </span>
  );
}

function RsiValue({ rsi }: { rsi: number }) {
  const color =
    rsi < 30 ? "text-emerald-400" :
    rsi > 70 ? "text-red-400" :
    "text-slate-300";
  return <span className={color}>{rsi.toFixed(1)}</span>;
}

function TrendIcon({ trend }: { trend: Trend }) {
  if (trend === Trend.BULLISH) return <span className="flex items-center gap-1 text-emerald-400"><TrendingUp size={13} /> Alcista</span>;
  if (trend === Trend.BEARISH) return <span className="flex items-center gap-1 text-red-400"><TrendingDown size={13} /> Bajista</span>;
  return <span className="flex items-center gap-1 text-slate-500"><Minus size={13} /> Neutral</span>;
}

function formatPrice(price: number): string {
  if (price >= 1000) return `$${price.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
  return `$${price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
