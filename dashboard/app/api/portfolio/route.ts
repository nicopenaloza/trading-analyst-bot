import { NextResponse } from "next/server";
import { services } from "@/lib/services";

export async function GET() {
  const snapshot  = services.execution.getSnapshot();
  const positions = services.portfolio.getPositions();

  return NextResponse.json({ snapshot, positions });
}
