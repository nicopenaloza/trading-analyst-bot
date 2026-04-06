"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { RefreshCw } from "lucide-react";
import type { TickerSnapshot } from "@/app/api/snapshot/route";
import type { PipelineResult, PortfolioSnapshot, TradingDecision, ClosedTrade } from "@bot/core/types.js";
import PortfolioBar   from "./PortfolioBar";
import WatchlistTable from "./WatchlistTable";
import SearchBar      from "./SearchBar";
import AnalysisPanel  from "./AnalysisPanel";
import HistoryTable   from "./HistoryTable";

const REFRESH_INTERVAL_MS = 5 * 60 * 1_000; // 5 minutes

export default function Dashboard() {
  const [snapshots,    setSnapshots]    = useState<TickerSnapshot[]>([]);
  const [portfolio,    setPortfolio]    = useState<{ snapshot: PortfolioSnapshot } | null>(null);
  const [history,      setHistory]      = useState<{ decisions: TradingDecision[]; closedTrades: ClosedTrade[] } | null>(null);
  const [activeResult, setActiveResult] = useState<PipelineResult | null>(null);
  const [loadingTicker, setLoadingTicker] = useState<string | null>(null);
  const [lastRefresh,  setLastRefresh]  = useState<Date | null>(null);
  const [refreshing,   setRefreshing]   = useState(false);

  // ── Data fetching ─────────────────────────────────────────────────────────────

  const fetchSnapshots = useCallback(async () => {
    try {
      const res  = await fetch("/api/snapshot");
      const data = await res.json() as TickerSnapshot[];
      setSnapshots(data);
    } catch { /* silent — keep stale data */ }
  }, []);

  const fetchPortfolio = useCallback(async () => {
    try {
      const res  = await fetch("/api/portfolio");
      const data = await res.json() as { snapshot: PortfolioSnapshot };
      setPortfolio(data);
    } catch { /* silent */ }
  }, []);

  const fetchHistory = useCallback(async () => {
    try {
      const res  = await fetch("/api/history");
      const data = await res.json() as { decisions: TradingDecision[]; closedTrades: ClosedTrade[] };
      setHistory(data);
    } catch { /* silent */ }
  }, []);

  const refreshAll = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchSnapshots(), fetchPortfolio(), fetchHistory()]);
    setLastRefresh(new Date());
    setRefreshing(false);
  }, [fetchSnapshots, fetchPortfolio, fetchHistory]);

  // Initial load + periodic refresh
  useEffect(() => {
    void refreshAll();
    const id = setInterval(() => void refreshAll(), REFRESH_INTERVAL_MS);
    return () => clearInterval(id);
  }, [refreshAll]);

  // ── On-demand analysis ────────────────────────────────────────────────────────

  const handleAnalyze = useCallback(async (ticker: string, market: string) => {
    setLoadingTicker(ticker);
    setActiveResult(null);
    try {
      const res  = await fetch("/api/analyze", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ ticker, market }),
      });
      const data = await res.json() as PipelineResult | { error: string };

      if ("error" in data) throw new Error(data.error);

      setActiveResult(data);
      // Refresh snapshots so the watchlist row shows the new signal
      await Promise.all([fetchSnapshots(), fetchPortfolio(), fetchHistory()]);
    } catch (err) {
      alert(`Analysis failed: ${String(err)}`);
    } finally {
      setLoadingTicker(null);
    }
  }, [fetchSnapshots, fetchPortfolio, fetchHistory]);

  // ── Watchlist mutation ────────────────────────────────────────────────────────

  const handleAddToWatchlist = useCallback(async (ticker: string, market: string) => {
    await fetch("/api/watchlist", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ ticker, market }),
    });
    await fetchSnapshots();
  }, [fetchSnapshots]);

  const handleRemoveFromWatchlist = useCallback(async (ticker: string) => {
    await fetch(`/api/watchlist/${ticker}`, { method: "DELETE" });
    setSnapshots((prev) => prev.filter((s) => s.ticker !== ticker));
    if (activeResult?.symbol.ticker === ticker) setActiveResult(null);
  }, [activeResult]);

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col min-h-screen">

      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-[#1f2d42] bg-[#0f1623]/95 backdrop-blur px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-lg font-semibold tracking-tight text-white">Trading Bot</span>
          <span className="text-xs px-2 py-0.5 rounded-full border border-[#1f2d42] text-slate-400">
            BYMA · CEDEARs
          </span>
        </div>
        <div className="flex items-center gap-4">
          {lastRefresh && (
            <span className="text-xs text-slate-500">
              {lastRefresh.toLocaleTimeString("es-AR")}
            </span>
          )}
          <button
            onClick={() => void refreshAll()}
            disabled={refreshing}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors disabled:opacity-40"
          >
            <RefreshCw size={13} className={refreshing ? "animate-spin" : ""} />
            Actualizar
          </button>
        </div>
      </header>

      {/* Portfolio stats */}
      <PortfolioBar snapshot={portfolio?.snapshot ?? null} />

      {/* Main content */}
      <main className="flex-1 flex gap-0 overflow-hidden">

        {/* Left column */}
        <div className={`flex-1 overflow-y-auto px-6 py-5 space-y-6 transition-all ${activeResult ? "lg:max-w-[60%]" : ""}`}>
          <SearchBar
            onAnalyze={handleAnalyze}
            onAddToWatchlist={handleAddToWatchlist}
            loadingTicker={loadingTicker}
            watchlistTickers={snapshots.map((s) => s.ticker)}
          />

          <WatchlistTable
            snapshots={snapshots}
            loadingTicker={loadingTicker}
            onAnalyze={handleAnalyze}
            onRemove={handleRemoveFromWatchlist}
            onSelect={(snap) => {
              if (snap.lastDecision) {
                // Show cached decision without re-running if already analyzed
                setActiveResult(null); // clear then set below via analyze or direct
              }
              void handleAnalyze(snap.ticker, snap.market);
            }}
          />

          <HistoryTable history={history} />
        </div>

        {/* Right panel — analysis details */}
        {activeResult && (
          <div className="hidden lg:block w-[42%] min-w-[420px] max-w-[600px] border-l border-[#1f2d42] overflow-y-auto">
            <AnalysisPanel
              result={activeResult}
              watchlistTickers={snapshots.map((s) => s.ticker)}
              onAddToWatchlist={handleAddToWatchlist}
              onClose={() => setActiveResult(null)}
            />
          </div>
        )}
      </main>

      {/* Mobile analysis overlay */}
      {activeResult && (
        <div className="fixed inset-0 z-20 lg:hidden bg-[#080c14] overflow-y-auto">
          <AnalysisPanel
            result={activeResult}
            watchlistTickers={snapshots.map((s) => s.ticker)}
            onAddToWatchlist={handleAddToWatchlist}
            onClose={() => setActiveResult(null)}
          />
        </div>
      )}

    </div>
  );
}
