import axios from "axios";

const BASE = "https://fapi.binance.com";

/**
 * Lấy dữ liệu Market Maker cơ bản từ Binance Futures
 * (Funding Rate, Open Interest, Price, Volume, Long/Short Ratio)
 */
export async function getBinanceData(symbol) {
    const pair = symbol.toUpperCase();

    try {
        // 1️⃣ Funding Rate
        const funding = await axios.get(`${BASE}/fapi/v1/fundingRate`, {
            params: { symbol: pair, limit: 1 },
        });

        // 2️⃣ Open Interest
        const oi = await axios.get(`${BASE}/fapi/v1/openInterest`, {
            params: { symbol: pair },
        });

        // 3️⃣ 24h Ticker (Giá & Volume)
        const ticker = await axios.get(`${BASE}/fapi/v1/ticker/24hr`, {
            params: { symbol: pair },
        });

        // 4️⃣ Long/Short Ratio (Top Trader)
        const lsr = await axios.get(`${BASE}/futures/data/topLongShortAccountRatio`, {
            params: { symbol: pair, period: "5m", limit: 1 },
        });

        // ====== Xử lý dữ liệu ======
        const FR = parseFloat(funding.data[0]?.fundingRate || 0) * 100;
        const OI = parseFloat(oi.data.openInterest || 0);
        const Price = parseFloat(ticker.data.lastPrice || 0);
        const Vol = parseFloat(ticker.data.volume || 0);

        // ✅ Tính đúng tỷ lệ Long/Short
        const lsrData = lsr.data?.[0] || {};
        const longShortRatio = parseFloat(lsrData.longShortRatio || 1).toFixed(2);
        const longAccount = parseFloat(lsrData.longAccount || 0);
        const shortAccount = parseFloat(lsrData.shortAccount || 0);

        let longPct = "N/A", shortPct = "N/A";
        if (longAccount > 0 && shortAccount > 0) {
            const total = longAccount + shortAccount;
            longPct = ((longAccount / total) * 100).toFixed(1);
            shortPct = ((shortAccount / total) * 100).toFixed(1);
        }

        return {
            fundingRate: FR.toFixed(4) + "%",
            openInterest: `${OI.toFixed(2)} USDT`,
            price: Price.toFixed(2),
            volume24h: `${Vol.toFixed(2)}`,
            longShortRatio,
            longRatio: longPct + "%",
            shortRatio: shortPct + "%",
            takerBuy: "N/A",
            takerSell: "N/A",
            delta: "N/A",
        };
    } catch (err) {
        console.error("❌ Binance API error:", err.response?.status, err.response?.statusText);
        return {
            fundingRate: "N/A",
            openInterest: "N/A",
            price: "N/A",
            volume24h: "N/A",
            longShortRatio: "N/A",
            longRatio: "N/A",
            shortRatio: "N/A",
            takerBuy: "N/A",
            takerSell: "N/A",
            delta: "N/A",
        };
    }
}
