import { NextResponse } from "next/server";
import { removeFromWatchlist } from "@/lib/watchlist";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ ticker: string }> },
) {
  const { ticker } = await params;
  const updated = await removeFromWatchlist(ticker.toUpperCase());
  return NextResponse.json(updated);
}
