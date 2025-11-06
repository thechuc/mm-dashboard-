import axios from "axios";

const BASE = "https://fapi.binance.com";

/**
 * Lấy dữ liệu Market Maker cơ bản từ Binance Futures
 * (Funding Rate, Open Interest, Price, Volume, Long/Short Ratio)
 */
export async function getBinanceData(symbol) {
  const pair = symbol.toUpperCase();

  try {
    // config HTTP chung để tránh bị chặn
    const http = axios.create({
      baseURL: BASE,
      timeout: 8000,
      headers: {
        "User-Agent": "MM-Dashboard/1.0",
        "Accept": "application/json",
      },
    });

    // 1️⃣ Funding Rate
    const funding = await http.get(`/fapi/v1/fundingRate`, {
      params: { symbol: pair, limit: 1 },
    });

    // 2️⃣ Open Interest
    const oi = await http.get(`/fapi/v1/openInterest`, {
      params: { symbol: pair },
    });

    // 3️⃣ 24h Stats (Giá + Volume)
    const ticker = await http.get(`/fapi/v1/ticker/24hr`, {
      params: { symbol: pair },
    });

    // 4️⃣ Long/Short Ratio
    const lsr = await http.get(`/futures/data/topLongShortAccountRatio`, {
      params: { symbol: pair, period: "5m", limit: 1 },
    });

    // ====== Xử lý dữ liệu ======
    const FR = parseFloat(funding.data?.[0]?.fundingRate || 0) * 100;
    const OI = parseFloat(oi.data?.openInterest || 0);
    const Price = parseFloat(ticker.data?.lastPrice || 0);
    const Vol = parseFloat(ticker.data?.volume || 0);

    const lsrData = lsr.data?.[0] || {};
    const ratio = parseFloat(lsrData.longShortRatio || 1);
    const longPct = (ratio / (1 + ratio)) * 100;
    const shortPct = 100 - longPct;

    return {
      fundingRate: FR ? `${FR.toFixed(4)}%` : "N/A",
      openInterest: OI ? `${OI.toFixed(2)} USDT` : "N/A",
      price: Price ? Price.toFixed(2) : "N/A",
      volume24h: Vol ? Vol.toFixed(2) : "N/A",
      longShortRatio: ratio.toFixed(2),
      longRatio: `${longPct.toFixed(1)}%`,
      shortRatio: `${shortPct.toFixed(1)}%`,
      takerBuy: "N/A",
      takerSell: "N/A",
      delta: "N/A",
    };
  } catch (err) {
    console.error("❌ Binance API error:", err?.message);
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
