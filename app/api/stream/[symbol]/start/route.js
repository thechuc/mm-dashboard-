import { NextResponse } from "next/server";
import { startBinanceFeed } from "@/services/ws-binance.js";

/**
 * API: /api/stream/[symbol]/start
 * Dùng để khởi động feed WebSocket cho cặp coin
 */
export async function GET(req, contextPromise) {
    // ✅ unwrap Promise (Next.js 16)
    const resolved = await contextPromise;
    const params = await resolved.params;
    const symbol = params?.symbol?.toUpperCase?.();

    if (!symbol) {
        console.error("❌ Missing symbol param");
        return NextResponse.json({ error: "Missing symbol" }, { status: 400 });
    }

    console.log(`[WS] Request start feed for ${symbol}`);
    await startBinanceFeed(symbol);
    return NextResponse.json({ message: `Started WebSocket feed for ${symbol}` });
}
