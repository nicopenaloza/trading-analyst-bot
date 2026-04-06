import { NextResponse } from "next/server";
import { services } from "@/lib/services";

const LIMIT = 30;

export async function GET() {
  const [decisions, closedTrades] = await Promise.all([
    services.repos.decisions.findAll(),
    services.repos.trades.findAllClosed(),
  ]);

  return NextResponse.json({
    decisions:   decisions.slice(-LIMIT).reverse(),
    closedTrades: closedTrades.slice(-LIMIT).reverse(),
  });
}
