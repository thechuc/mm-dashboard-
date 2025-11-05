import { NextResponse } from "next/server";
import { getBinanceData } from "@/services/binance.js";
import { getTakerStats } from "@/services/ws-binance.js";

const timeframes = ["M5", "M15", "H1"];

export async function GET(req, context) {
    // ✅ Next 16: unwrap Promise first
    const resolved = await context;
    const params = await resolved.params;
    const symbol = params?.symbol?.toUpperCase?.();

    if (!symbol) {
        console.error("❌ Missing symbol param");
        return NextResponse.json({ error: "Missing symbol" }, { status: 400 });
    }

    console.log(`📡 [API] Fetching MM data for ${symbol} ...`);

    const takerStats = getTakerStats();
    const results = {};

    for (const tf of timeframes) {
        try {
            results[tf] = await getBinanceData(symbol);
            results[tf].takerBuy = takerStats.buy;
            results[tf].takerSell = takerStats.sell;
            results[tf].delta = takerStats.delta;
            await new Promise((r) => setTimeout(r, 400)); // tránh rate limit
        } catch (err) {
            console.error(`[${tf}] Error: ${err.message}`);
            results[tf] = null;
        }
    }

    return NextResponse.json({
        symbol,
        exchange: "Binance Futures",
        timeframes: results,
        timestamp: new Date().toISOString(),
    });
}
