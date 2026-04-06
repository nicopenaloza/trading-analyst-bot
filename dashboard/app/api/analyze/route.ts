import { type NextRequest, NextResponse } from "next/server";
import { services } from "@/lib/services";
import type { Market } from "@bot/core/types.js";

export async function POST(req: NextRequest) {
  const { ticker, market } = (await req.json()) as { ticker: string; market: Market };

  if (!ticker || !market) {
    return NextResponse.json({ error: "ticker and market are required" }, { status: 400 });
  }

  try {
    const symbol = { ticker: ticker.toUpperCase(), market };
    const result = await services.orchestrator.processSymbol(symbol);
    return NextResponse.json(result);
  } catch (err) {
    console.error("[analyze]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
