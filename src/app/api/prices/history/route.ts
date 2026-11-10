import { NextResponse } from "next/server";
import { get8Point24hHistory } from "@/utils/prices";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const symbol = (searchParams.get("symbol") || "BTC").toUpperCase();

    const allowedSymbols = ["BTC", "ETH", "SOL", "DOGE"];
    const targetSymbol = allowedSymbols.includes(symbol) ? symbol : "BTC";

    const points = await get8Point24hHistory(targetSymbol);

    return NextResponse.json({
      success: true,
      symbol: targetSymbol,
      interval: "3h",
      count: points.length,
      data: points,
      cachedAt: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "History fetch failed";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
