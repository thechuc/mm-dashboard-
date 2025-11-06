import axios from "axios";

const BASE = "https://fapi.binance.com";

/**
 * Lấy dữ liệu Market Maker cơ bản từ Binance Futures.
 * Nếu bị lỗi 451/CORS, tự động fallback qua proxy route.
 */
export async function getBinanceData(symbol) {
  const pair = symbol.toUpperCase();
  const proxy = `/api/proxy/binance?url=`;

  async function tryFetch(url) {
    try {
      const res = await axios.get(url, { timeout: 8000 });
      if (res.status === 451 || typeof res.data !== "object") throw new Error("blocked");
      return res.data;
    } catch (err) {
      console.warn("⚠️ Direct call failed, fallback proxy:", url);
      const proxyUrl = proxy + encodeURIComponent(url);
      const r = await fetch(proxyUrl, { cache: "no-store" });
      if (!r.ok) throw new Error("Proxy failed " + r.status);
      return await r.json();
    }
  }

  try {
    // === Fetch data ===
    const funding = await tryFetch(`${BASE}/fapi/v1/fundingRate?symbol=${pair}&limit=1`);
    const oi = await tryFetch(`${BASE}/fapi/v1/openInterest?symbol=${pair}`);
    const ticker = await tryFetch(`${BASE}/fapi/v1/ticker/24hr?symbol=${pair}`);
    const lsr = await tryFetch(`${BASE}/futures/data/topLongShortAccountRatio?symbol=${pair}&period=5m&limit=1`);

    // === Parse ===
    const FR = parseFloat(funding[0]?.fundingRate || 0) * 100;
    const OI = parseFloat(oi.openInterest || 0);
    const Price = parseFloat(ticker.lastPrice || 0);
    const Vol = parseFloat(ticker.volume || 0);

    const lsrData = lsr[0] || {};
    const ratio = parseFloat(lsrData.longShortRatio || 1);
    const longPct = (100 * ratio / (1 + ratio)).toFixed(1);
    const shortPct = (100 - longPct).toFixed(1);

    return {
      fundingRate: `${FR.toFixed(4)}%`,
      openInterest: `${OI.toFixed(2)} USDT`,
      price: Price.toFixed(2),
      volume24h: `${Vol.toFixed(2)}`,
      longShortRatio: ratio.toFixed(2),
      longRatio: `${longPct}%`,
      shortRatio: `${shortPct}%`,
      takerBuy: "N/A",
      takerSell: "N/A",
      delta: "N/A",
    };
  } catch (err) {
    console.error("❌ Binance API error:", err.message);
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
