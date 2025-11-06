import WebSocket from "ws";
import axios from "axios";

const BASE = "https://fapi.binance.com";

let feeds = {}; // cache: { BTCUSDT: { ws, data } }

export function getTakerStats(symbol = "BTCUSDT") {
    const s = feeds[symbol.toUpperCase()];
    if (!s) return defaultStats();
    return s.data;
}

function defaultStats() {
    return {
        price: "N/A",
        volume24h: "N/A",
        fundingRate: "N/A",
        openInterest: "N/A",
        longShortRatio: "N/A",
        longRatio: "N/A",
        shortRatio: "N/A",
        takerBuy: "N/A",
        takerSell: "N/A",
        delta: "N/A",
        updatedAt: new Date().toISOString(),
    };
}

export async function startBinanceFeed(symbol) {
    symbol = symbol.toUpperCase();

    // Nếu đã có feed đang chạy => dùng lại
    if (feeds[symbol]?.ws?.readyState === WebSocket.OPEN) {
        return;
    }

    // Ngắt feed cũ (nếu có)
    if (feeds[symbol]?.ws) {
        try { feeds[symbol].ws.close(); } catch { }
    }

    const data = defaultStats();
    feeds[symbol] = { ws: null, data };

    const streams = [
        `${symbol.toLowerCase()}@aggTrade`,
        `${symbol.toLowerCase()}@markPrice@1s`,
        `${symbol.toLowerCase()}@ticker`,
    ].join("/");

    const url = `wss://fstream.binance.com/stream?streams=${streams}`;
    console.log(`📡 [WS] Connecting multi-stream for ${symbol} ...`);

    const ws = new WebSocket(url);
    feeds[symbol].ws = ws;

    let buyVol = 0, sellVol = 0;

    ws.on("open", () => console.log(`✅ [WS] Connected: ${symbol}`));

    ws.on("message", (msg) => {
        try {
            const parsed = JSON.parse(msg);
            const { stream, data: d } = parsed;

            // === aggTrade ===
            if (stream.endsWith("@aggTrade")) {
                const p = parseFloat(d.p);
                const q = parseFloat(d.q);
                const vol = p * q;
                if (!d.m) buyVol += vol;
                else sellVol += vol;
            }

            // === markPrice ===
            else if (stream.endsWith("@markPrice@1s")) {
                data.price = parseFloat(d.p).toFixed(2);
                data.fundingRate = (parseFloat(d.r) * 100).toFixed(4) + "%";
            }

            // === ticker ===
            else if (stream.endsWith("@ticker")) {
                data.volume24h = parseFloat(d.v || d.V || 0).toFixed(2);
            }
        } catch (err) {
            console.error("WS parse error:", err.message);
        }
    });

    // Cập nhật định kỳ mỗi 5s
    setInterval(async () => {
        const delta = buyVol - sellVol;
        data.takerBuy = buyVol.toFixed(2);
        data.takerSell = sellVol.toFixed(2);
        data.delta = delta.toFixed(2);
        data.updatedAt = new Date().toISOString();

        console.log(`[WS] ${symbol} Δ=${data.delta}  FR=${data.fundingRate}`);

        buyVol = 0;
        sellVol = 0;
    }, 5000);

    // REST fallback (Open Interest + LSR)
    setInterval(async () => {
        try {
            const [oi, lsr] = await Promise.all([
                axios.get(`${BASE}/fapi/v1/openInterest?symbol=${symbol}`),
                axios.get(`${BASE}/futures/data/topLongShortAccountRatio`, {
                    params: { symbol, period: "5m", limit: 1 },
                }),
            ]);
            const OI = parseFloat(oi.data.openInterest || 0);
            const l = lsr.data[0];
            const ratio = parseFloat(l.longShortRatio || 1);
            const longPct = (100 * ratio / (1 + ratio)).toFixed(1);
            const shortPct = (100 - longPct).toFixed(1);
            data.openInterest = `${OI.toFixed(2)} USDT`;
            data.longShortRatio = ratio.toFixed(2);
            data.longRatio = `${longPct}%`;
            data.shortRatio = `${shortPct}%`;
        } catch (e) {
            console.warn(`⚠️ [WS] Fallback REST failed for ${symbol}:`, e.message);
        }
    }, 30000);

    ws.on("close", () => {
        console.log(`⚠️ [WS] Closed for ${symbol}, reconnecting in 5s...`);
        setTimeout(() => startBinanceFeed(symbol), 5000);
    });

    ws.on("error", (err) => {
        console.error(`WS error (${symbol}):`, err.message);
        try { ws.close(); } catch { }
    });
}
// ===== STOP FEED =====
export async function stopBinanceFeed(symbol) {
    if (symbol) symbol = symbol.toUpperCase();

    // Nếu có symbol cụ thể → chỉ dừng stream đó
    if (symbol && feeds[symbol]?.ws) {
        console.log(`🛑 [WS] Stop feed for ${symbol}`);
        try {
            feeds[symbol].ws.close();
        } catch { }
        delete feeds[symbol];
        return;
    }

    // Nếu không truyền symbol → dừng tất cả
    console.log("🛑 [WS] Stop ALL Binance feeds");
    for (const s in feeds) {
        try {
            feeds[s].ws.close();
        } catch { }
    }
    feeds = {};
}
