"use client";

import { useState } from "react";
import { Search, Plus, Loader2 } from "lucide-react";
import { Market } from "@bot/core/types.js";

interface Props {
  onAnalyze:          (ticker: string, market: string) => Promise<void>;
  onAddToWatchlist:   (ticker: string, market: string) => Promise<void>;
  loadingTicker:      string | null;
  watchlistTickers:   string[];
}

export default function SearchBar({ onAnalyze, onAddToWatchlist, loadingTicker, watchlistTickers }: Props) {
  const [ticker, setTicker] = useState("");
  const [market, setMarket] = useState<Market>(Market.BYMA);

  const clean    = ticker.trim().toUpperCase();
  const isLoading = loadingTicker === clean;
  const inWatchlist = watchlistTickers.includes(clean);

  const handleAnalyze = async () => {
    if (!clean) return;
    await onAnalyze(clean, market);
  };

  const handleAdd = async () => {
    if (!clean) return;
    await onAddToWatchlist(clean, market);
    setTicker("");
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex items-center gap-2 flex-1 min-w-[280px] bg-[#0f1623] border border-[#1f2d42] rounded-lg px-3 py-2 focus-within:border-slate-500">
        <Search size={14} className="text-slate-500 shrink-0" />
        <input
          type="text"
          value={ticker}
          onChange={(e) => setTicker(e.target.value.toUpperCase())}
          onKeyDown={(e) => e.key === "Enter" && void handleAnalyze()}
          placeholder="Buscar ticker  (GGAL, AAPL...)"
          className="flex-1 bg-transparent text-sm text-slate-200 placeholder:text-slate-600 outline-none font-mono"
        />
      </div>

      <select
        value={market}
        onChange={(e) => setMarket(e.target.value as Market)}
        className="bg-[#0f1623] border border-[#1f2d42] text-sm text-slate-300 rounded-lg px-3 py-2 outline-none cursor-pointer hover:border-slate-500"
      >
        <option value={Market.BYMA}>BYMA</option>
        <option value={Market.CEDEAR}>CEDEAR</option>
      </select>

      <button
        onClick={() => void handleAnalyze()}
        disabled={!clean || isLoading}
        className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-sm font-medium text-white transition-colors"
      >
        {isLoading ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
        Analizar
      </button>

      {clean && !inWatchlist && (
        <button
          onClick={() => void handleAdd()}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-[#1f2d42] hover:border-slate-500 text-sm text-slate-300 hover:text-white transition-colors"
        >
          <Plus size={14} />
          Agregar watchlist
        </button>
      )}
    </div>
  );
}
