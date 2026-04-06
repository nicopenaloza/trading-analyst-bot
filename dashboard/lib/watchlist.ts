import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "path";
import type { Market } from "@bot/core/types.js";

export interface WatchlistEntry {
  ticker: string;
  market: Market;
}

const FILE = path.join(process.cwd(), "../data/watchlist.json");

export async function readWatchlist(): Promise<WatchlistEntry[]> {
  try {
    const raw = await readFile(FILE, "utf-8");
    return JSON.parse(raw) as WatchlistEntry[];
  } catch {
    return [];
  }
}

async function writeWatchlist(entries: WatchlistEntry[]): Promise<void> {
  await mkdir(path.dirname(FILE), { recursive: true });
  await writeFile(FILE, JSON.stringify(entries, null, 2), "utf-8");
}

export async function addToWatchlist(entry: WatchlistEntry): Promise<WatchlistEntry[]> {
  const list = await readWatchlist();
  if (!list.some((e) => e.ticker === entry.ticker && e.market === entry.market)) {
    list.push(entry);
    await writeWatchlist(list);
  }
  return list;
}

export async function removeFromWatchlist(ticker: string): Promise<WatchlistEntry[]> {
  const list = (await readWatchlist()).filter((e) => e.ticker !== ticker);
  await writeWatchlist(list);
  return list;
}
