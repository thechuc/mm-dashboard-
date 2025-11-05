import { NextResponse } from "next/server";
import { stopBinanceFeed } from "@/services/ws-binance.js";

/**
 * API: /api/stream/stop
 * Dừng feed WebSocket đang chạy
 */
export async function GET() {
    console.log(`[WS] Request stop feed`);
    await stopBinanceFeed();
    return NextResponse.json({ message: "Stopped WebSocket feed" });
}
