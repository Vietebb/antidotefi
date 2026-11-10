import { NextResponse } from "next/server";
import { getLiveMarketPrices, type LiveAssetPrice } from "@/utils/prices";

export type { LiveAssetPrice as AssetPrice };

export async function GET() {
  try {
    const { source, prices } = await getLiveMarketPrices();

    return NextResponse.json({
      success: true,
      source: `Live Feed // ${source}`,
      data: prices,
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Price stream error";
    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 500 }
    );
  }
}
