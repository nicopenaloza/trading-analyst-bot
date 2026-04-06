import { type NextRequest, NextResponse } from "next/server";
import { readWatchlist, addToWatchlist } from "@/lib/watchlist";
import type { Market } from "@bot/core/types.js";

export async function GET() {
  const list = await readWatchlist();
  return NextResponse.json(list);
}

export async function POST(req: NextRequest) {
  const { ticker, market } = (await req.json()) as { ticker: string; market: Market };

  if (!ticker || !market) {
    return NextResponse.json({ error: "ticker and market are required" }, { status: 400 });
  }

  const updated = await addToWatchlist({ ticker: ticker.toUpperCase(), market });
  return NextResponse.json(updated, { status: 201 });
}
