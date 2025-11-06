import axios from "axios";

const BASE = "https://fapi.binance.com";

/**
 * Lấy dữ liệu Market Maker cơ bản từ Binance Futures.
 * Tự động fallback sang proxy nếu server bị 451.
 */
export async function getBinanceData(symbol) {
  const pair = symbol.toUpperCase();
  const proxy = `/api/proxy/binance?url=`;

  try {
    // REST API Binance
    const fundingUrl = `${BASE}/fapi/v1/fundingRate?symbol=${pair}&limit=1`;
    const oiUrl = `${BASE}/fapi/v1/openInterest?symbol=${pair}`;
    const tickerUrl = `${BASE}/fapi/v1/ticker/24hr?symbol=${pair}`;
    const lsrUrl = `${BASE}/futures/data/topLongShortAccountRatio?symbol=${pair}&period=5m&limit=1`;

    // 🧠 Nếu gọi trực tiếp bị lỗi 451 → gọi qua proxy (Netlify client IP VN)
    const funding = await axios.get(fundingUrl).catch(() => axios.get(proxy + encodeURIComponent(fundingUrl)));
    const oi = await axios.get(oiUrl).catch(() => axios.get(proxy + encodeURIComponent(oiUrl)));
    const ticker = await axios.get(tickerUrl).catch(() => axios.get(proxy + encodeURIComponent(tickerUrl)));
    const lsr = await axios.get(lsrUrl).catch(() => axios.get(proxy + encodeURIComponent(lsrUrl)));

    // Xử lý dữ liệu
    const FR = parseFloat(funding.data[0]?.fundingRate || 0) * 100;
    const OI = parseFloat(oi.data.openInterest || 0);
    const Price = parseFloat(ticker.data.lastPrice || 0);
    const Vol = parseFloat(ticker.data.volume || 0);

    const lsrData = lsr.data?.[0] || {};
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
