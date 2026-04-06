"use client";

import type { PortfolioSnapshot } from "@bot/core/types.js";

interface Props {
  snapshot: PortfolioSnapshot | null;
}

export default function PortfolioBar({ snapshot }: Props) {
  if (!snapshot) {
    return (
      <div className="border-b border-[#1f2d42] bg-[#0f1623] px-6 py-2.5 flex gap-6 text-xs text-slate-500">
        <span>Cargando portfolio...</span>
      </div>
    );
  }

  const pnlPositive = snapshot.totalPnL >= 0;
  const pnlColor    = pnlPositive ? "text-emerald-400" : "text-red-400";
  const pnlSign     = pnlPositive ? "+" : "";

  return (
    <div className="border-b border-[#1f2d42] bg-[#0f1623] px-6 py-2.5 flex flex-wrap gap-x-8 gap-y-1 text-xs">
      <Stat label="Capital" value={`$${snapshot.totalValue.toLocaleString("en-US", { maximumFractionDigits: 0 })}`} />
      <Stat label="Efectivo" value={`$${snapshot.cash.toLocaleString("en-US", { maximumFractionDigits: 0 })}`} />
      <Stat
        label="P&L Total"
        value={`${pnlSign}$${Math.abs(snapshot.totalPnL).toLocaleString("en-US", { maximumFractionDigits: 2 })}`}
        className={pnlColor}
      />
      <Stat
        label="P&L Realizado"
        value={`${snapshot.realizedPnL >= 0 ? "+" : ""}$${snapshot.realizedPnL.toLocaleString("en-US", { maximumFractionDigits: 2 })}`}
        className={snapshot.realizedPnL >= 0 ? "text-emerald-400" : "text-red-400"}
      />
      <Stat label="Posiciones abiertas" value={String(snapshot.openPositions.length)} />
      <Stat label="Trades cerrados"     value={String(snapshot.closedTrades.length)} />
    </div>
  );
}

function Stat({ label, value, className = "text-slate-200" }: { label: string; value: string; className?: string }) {
  return (
    <div className="flex items-baseline gap-1.5">
      <span className="text-slate-500">{label}</span>
      <span className={`font-mono font-medium ${className}`}>{value}</span>
    </div>
  );
}
