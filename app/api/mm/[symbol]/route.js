import { NextResponse } from "next/server";
import { getTakerStats, startBinanceFeed } from "@/services/ws-binance.js";

const timeframes = ["M5", "M15", "H1"];

export async function GET(req, contextPromise) {
    // ✅ Next 16: unwrap Promise 2 cấp
    const context = await contextPromise;
    const params = await context.params;
    const symbol = params?.symbol?.toUpperCase?.();

    if (!symbol) {
        console.error("❌ Missing symbol param");
        return NextResponse.json({ error: "Missing symbol" }, { status: 400 });
    }

    console.log(`📡 [API] Fetching WS data for ${symbol} ...`);

    await startBinanceFeed(symbol);

    const stats = getTakerStats();
    const results = {};
    for (const tf of timeframes) {
        results[tf] = { ...stats };
    }

    return NextResponse.json({
        symbol,
        exchange: "Binance Futures",
        timeframes: results,
        timestamp: new Date().toISOString(),
    });
}
