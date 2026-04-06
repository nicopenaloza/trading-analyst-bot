"use client";

import { X, Star, TrendingUp, TrendingDown, Minus } from "lucide-react";
import type { PipelineResult } from "@bot/core/types.js";
import { Signal, Trend, ExecutionStatus, ValidationStatus } from "@bot/core/types.js";

interface Props {
  result:            PipelineResult;
  watchlistTickers:  string[];
  onAddToWatchlist:  (ticker: string, market: string) => Promise<void>;
  onClose:           () => void;
}

export default function AnalysisPanel({ result, watchlistTickers, onAddToWatchlist, onClose }: Props) {
  const { symbol, marketData: md, technicalAnalysis: ta, newsAnalysis: na, decision, riskProfile, validation, execution } = result;
  const inWatchlist = watchlistTickers.includes(symbol.ticker);
  const changePercent = ((md.close - md.open) / md.open) * 100;

  return (
    <div className="flex flex-col h-full bg-[#0f1623]">

      {/* Header */}
      <div className="sticky top-0 z-10 bg-[#0f1623] border-b border-[#1f2d42] px-5 py-4 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold font-mono text-white">{symbol.ticker}</span>
            <span className="text-xs px-1.5 py-0.5 rounded border border-[#1f2d42] text-slate-500">{symbol.market}</span>
            {!inWatchlist && (
              <button
                onClick={() => void onAddToWatchlist(symbol.ticker, symbol.market)}
                className="flex items-center gap-1 text-xs px-2 py-0.5 rounded border border-amber-400/30 text-amber-400 hover:bg-amber-400/10 transition-colors"
              >
                <Star size={11} />
                Agregar watchlist
              </button>
            )}
          </div>
          {symbol.name && <p className="text-xs text-slate-500 mt-0.5">{symbol.name}</p>}
          <div className="flex items-baseline gap-3 mt-1">
            <span className="text-2xl font-mono font-semibold text-slate-100">{formatPrice(md.close)}</span>
            <span className={`text-sm font-mono ${changePercent >= 0 ? "text-emerald-400" : "text-red-400"}`}>
              {changePercent >= 0 ? "+" : ""}{changePercent.toFixed(2)}%
            </span>
          </div>
        </div>
        <button onClick={onClose} className="p-1.5 text-slate-500 hover:text-white transition-colors">
          <X size={16} />
        </button>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto divide-y divide-[#1f2d42]">

        {/* Market data */}
        <Section title="Datos de Mercado">
          <div className="grid grid-cols-3 gap-3">
            <KV label="Apertura"  value={formatPrice(md.open)} />
            <KV label="Máximo"    value={formatPrice(md.high)} />
            <KV label="Mínimo"    value={formatPrice(md.low)} />
            <KV label="Cierre"    value={formatPrice(md.close)} />
            <KV label="Volumen"   value={formatVolume(md.volume)} />
            {md.cclRate && <KV label="CCL" value={`$${md.cclRate.toLocaleString()}`} />}
          </div>
        </Section>

        {/* Technical analysis */}
        <Section title="Análisis Técnico">
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <KV label="RSI(14)"   value={<RsiDisplay rsi={ta.rsi} />} />
              <KV label="Tendencia" value={<TrendDisplay trend={ta.trend} />} />
              <KV label="EMA 20"    value={formatPrice(ta.ema20)} />
              <KV label="EMA 50"    value={formatPrice(ta.ema50)} />
            </div>
            <div className="rounded-lg bg-[#161e2e] border border-[#1f2d42] p-3 space-y-1.5 text-xs font-mono">
              <div className="flex justify-between">
                <span className="text-slate-500">MACD</span>
                <span className={ta.macd.value >= 0 ? "text-emerald-400" : "text-red-400"}>{ta.macd.value.toFixed(4)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Señal</span>
                <span className="text-slate-300">{ta.macd.signal.toFixed(4)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Histograma</span>
                <span className={ta.macd.histogram >= 0 ? "text-emerald-400" : "text-red-400"}>{ta.macd.histogram.toFixed(4)}</span>
              </div>
            </div>
            <EmaCrossInfo ema20={ta.ema20} ema50={ta.ema50} />
          </div>
        </Section>

        {/* News */}
        <Section title="Noticias & Sentimiento">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <SentimentBadge sentiment={na.overallSentiment} />
              <span className="text-xs text-slate-400">Score: <span className="font-mono text-slate-200">{na.sentimentScore.toFixed(3)}</span></span>
              <span className="text-xs text-slate-400">Impacto: <span className="font-mono text-slate-200">{na.impactScore.toFixed(3)}</span></span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">{na.summary}</p>
            {na.items.length > 0 && (
              <div className="space-y-1.5 mt-2">
                {na.items.map((item, i) => (
                  <div key={i} className="text-xs rounded bg-[#161e2e] border border-[#1f2d42] px-3 py-2">
                    <span className="text-slate-300">{item.headline}</span>
                    <span className="text-slate-600 ml-2">— {item.source}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Section>

        {/* Decision */}
        <Section title="Decisión del Agente">
          <div className="space-y-3">
            <div className="flex items-center gap-4">
              <SignalBig signal={decision.signal} />
              <div>
                <p className="text-xs text-slate-500">Confianza</p>
                <ConfidenceBar confidence={decision.confidence} />
              </div>
              <div>
                <p className="text-xs text-slate-500">Razón</p>
                <p className="text-xs text-slate-300">{decision.reason}</p>
              </div>
            </div>
            <div className="rounded-lg bg-[#161e2e] border border-[#1f2d42] px-3 py-2.5 text-xs text-slate-400 leading-relaxed">
              {decision.reasoning}
            </div>
          </div>
        </Section>

        {/* Risk profile */}
        <Section title="Perfil de Riesgo">
          <div className="grid grid-cols-3 gap-3">
            <KV label="Entrada"    value={formatPrice(riskProfile.entryPrice)} />
            <KV label="Stop Loss"  value={<span className="text-red-400">{formatPrice(riskProfile.stopLossPrice)} <span className="text-slate-500">({(riskProfile.stopLossPercent * 100).toFixed(1)}%)</span></span>} />
            <KV label="Take Profit" value={<span className="text-emerald-400">{formatPrice(riskProfile.takeProfitPrice)} <span className="text-slate-500">(+{(riskProfile.takeProfitPercent * 100).toFixed(1)}%)</span></span>} />
            <KV label="Tamaño posición" value={`${(riskProfile.positionSize * 100).toFixed(1)}%`} />
          </div>
        </Section>

        {/* Validation */}
        <Section title="Validación de Portfolio">
          <div className="flex items-center gap-3">
            <ValidationBadge status={validation.status} />
            <p className="text-xs text-slate-400">{validation.reason}</p>
          </div>
          {validation.status !== "REJECTED" && (
            <p className="text-xs text-slate-500 mt-1">
              Tamaño ajustado: <span className="font-mono text-slate-300">{(validation.adjustedPositionSize * 100).toFixed(1)}%</span>
            </p>
          )}
        </Section>

        {/* Execution */}
        <Section title="Ejecución (Paper Trading)">
          <div className="flex items-center gap-3">
            <ExecutionBadge status={execution.status} />
            <p className="text-xs text-slate-400">{execution.reason}</p>
          </div>
          {execution.trade && (
            <div className="mt-2 rounded-lg bg-[#161e2e] border border-[#1f2d42] px-3 py-2.5 font-mono text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500">ID</span>
                <span className="text-slate-300">{execution.trade.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Cantidad</span>
                <span className="text-slate-300">{execution.trade.quantity.toFixed(4)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Precio</span>
                <span className="text-slate-300">{formatPrice(execution.trade.price)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Valor</span>
                <span className="text-slate-300">${execution.trade.value.toLocaleString("en-US", { maximumFractionDigits: 2 })}</span>
              </div>
            </div>
          )}
        </Section>

      </div>
    </div>
  );
}

// ── Layout helpers ────────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="px-5 py-4 space-y-3">
      <h3 className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">{title}</h3>
      {children}
    </div>
  );
}

function KV({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] text-slate-600 mb-0.5">{label}</p>
      <p className="text-xs font-mono text-slate-200">{value}</p>
    </div>
  );
}

// ── Badges & indicators ───────────────────────────────────────────────────────

function SignalBig({ signal }: { signal: Signal }) {
  const styles = {
    [Signal.BUY]:  "bg-emerald-400/10 text-emerald-400 border-emerald-400/30",
    [Signal.SELL]: "bg-red-400/10     text-red-400     border-red-400/30",
    [Signal.HOLD]: "bg-amber-400/10   text-amber-400   border-amber-400/30",
  };
  return (
    <span className={`inline-flex px-4 py-1.5 rounded-lg text-sm font-bold border ${styles[signal]}`}>
      {signal}
    </span>
  );
}

function ConfidenceBar({ confidence }: { confidence: number }) {
  const pct = Math.round(confidence * 100);
  const color = pct >= 70 ? "bg-emerald-400" : pct >= 50 ? "bg-amber-400" : "bg-slate-500";
  return (
    <div className="flex items-center gap-2 mt-0.5">
      <div className="w-20 h-1.5 rounded-full bg-[#1f2d42]">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-mono text-slate-300">{pct}%</span>
    </div>
  );
}

function SentimentBadge({ sentiment }: { sentiment: string }) {
  const styles: Record<string, string> = {
    POSITIVE: "bg-emerald-400/10 text-emerald-400 border-emerald-400/20",
    NEGATIVE: "bg-red-400/10     text-red-400     border-red-400/20",
    NEUTRAL:  "bg-slate-400/10   text-slate-400   border-slate-400/20",
  };
  const s = String(sentiment);
  return (
    <span className={`inline-flex px-2 py-0.5 rounded text-xs font-semibold border ${styles[s] ?? styles["NEUTRAL"]}`}>
      {s}
    </span>
  );
}

function ValidationBadge({ status }: { status: ValidationStatus }) {
  const styles = {
    [ValidationStatus.APPROVED]: "bg-emerald-400/10 text-emerald-400",
    [ValidationStatus.REDUCED]:  "bg-amber-400/10   text-amber-400",
    [ValidationStatus.REJECTED]: "bg-red-400/10     text-red-400",
  };
  return <span className={`text-xs font-semibold px-2 py-0.5 rounded ${styles[status]}`}>{status}</span>;
}

function ExecutionBadge({ status }: { status: ExecutionStatus }) {
  const styles = {
    [ExecutionStatus.EXECUTED]: "bg-emerald-400/10 text-emerald-400",
    [ExecutionStatus.SKIPPED]:  "bg-slate-400/10   text-slate-400",
  };
  return <span className={`text-xs font-semibold px-2 py-0.5 rounded ${styles[status]}`}>{status}</span>;
}

function RsiDisplay({ rsi }: { rsi: number }) {
  const color = rsi < 30 ? "text-emerald-400" : rsi > 70 ? "text-red-400" : "text-slate-200";
  const label = rsi < 30 ? "Sobrevendido" : rsi > 70 ? "Sobrecomprado" : rsi < 45 ? "Débil" : rsi > 55 ? "Fuerte" : "Neutral";
  return <span className={color}>{rsi.toFixed(1)} <span className="text-slate-500">({label})</span></span>;
}

function TrendDisplay({ trend }: { trend: Trend }) {
  if (trend === Trend.BULLISH) return <span className="flex items-center gap-1 text-emerald-400"><TrendingUp size={12} /> Alcista</span>;
  if (trend === Trend.BEARISH) return <span className="flex items-center gap-1 text-red-400"><TrendingDown size={12} /> Bajista</span>;
  return <span className="flex items-center gap-1 text-slate-400"><Minus size={12} /> Neutral</span>;
}

function EmaCrossInfo({ ema20, ema50 }: { ema20: number; ema50: number }) {
  const spread = ((ema20 - ema50) / ema50) * 100;
  const bullish = spread > 0;
  return (
    <div className={`rounded-lg px-3 py-2 text-xs border ${bullish ? "bg-emerald-400/5 border-emerald-400/20 text-emerald-300" : "bg-red-400/5 border-red-400/20 text-red-300"}`}>
      {bullish ? "Golden Cross" : "Death Cross"} — EMA20 {bullish ? "sobre" : "bajo"} EMA50 ({spread >= 0 ? "+" : ""}{spread.toFixed(2)}%)
    </div>
  );
}

// ── Formatting ────────────────────────────────────────────────────────────────

function formatPrice(price: number): string {
  if (price >= 1000) return `$${price.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
  return `$${price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatVolume(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000)     return `${(v / 1_000).toFixed(0)}K`;
  return String(v);
}
