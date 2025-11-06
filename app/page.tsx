"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dayjs from "dayjs";
import ReactMarkdown from "react-markdown";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";

// === Types ===
type TF = "M5" | "M15" | "H1";
type MMFrame = {
  fundingRate: string;
  openInterest: string;
  price: string;
  volume24h: string;
  longShortRatio: string;
  longRatio: string;
  shortRatio: string;
  takerBuy: string;
  takerSell: string;
  delta: string;
};
type MMResponse = {
  symbol: string;
  exchange: string;
  timeframes: Record<TF, MMFrame>;
  timestamp: string;
};
type Point = { t: string; M5?: number; M15?: number; H1?: number };
type Hist = { funding: Point[]; oi: Point[]; lsr: Point[] };

// === Config ===
const API_BASE =
  process.env.NEXT_PUBLIC_MM_API?.trim() || "http://localhost:3000";
const DEFAULT_SYMBOL =
  process.env.NEXT_PUBLIC_DEFAULT_SYMBOL?.trim() || "BTCUSDT";

// === Helpers ===
function parsePct(s?: string) {
  if (!s) return undefined;
  const v = parseFloat(s.replace("%", ""));
  return Number.isFinite(v) ? v : undefined;
}
function parseNum(s?: string) {
  if (!s) return undefined;
  const v = parseFloat(s.replace(/[^\d\.\-eE]/g, ""));
  return Number.isFinite(v) ? v : undefined;
}

// === Component ===
export default function Page() {
  const [symbol, setSymbol] = useState(DEFAULT_SYMBOL);
  const [mm, setMM] = useState<MMResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [hist, setHist] = useState<Hist>({ funding: [], oi: [], lsr: [] });
  const timer = useRef<NodeJS.Timeout | null>(null);

  // Fetch 1 lần
  const fetchOnce = async (sym: string) => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE?.trim()}/api/mm/${sym?.trim()}`, { cache: "no-store" });
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
      const data: MMResponse = await res.json();
      setMM(data);
      pushHistory(data);
      setErr(null);
    } catch (e: any) {
      setErr(e?.message || "fetch error");
    } finally {
      setLoading(false);
    }
  };

  // Lưu lịch sử chart
  const pushHistory = (data: MMResponse) => {
    const t = dayjs(data.timestamp).format("HH:mm:ss");
    const m5 = data.timeframes.M5;
    const m15 = data.timeframes.M15;
    const h1 = data.timeframes.H1;

    setHist((prev) => ({
      funding: [
        ...prev.funding.slice(-99),
        { t, M5: parsePct(m5.fundingRate), M15: parsePct(m15.fundingRate), H1: parsePct(h1.fundingRate) },
      ],
      oi: [
        ...prev.oi.slice(-99),
        { t, M5: parseNum(m5.openInterest), M15: parseNum(m15.openInterest), H1: parseNum(h1.openInterest) },
      ],
      lsr: [
        ...prev.lsr.slice(-99),
        { t, M5: parseNum(m5.longShortRatio), M15: parseNum(m15.longShortRatio), H1: parseNum(h1.longShortRatio) },
      ],
    }));
  };

  // Auto fetch + restart stream khi đổi symbol
  useEffect(() => {
    const startStream = async () => {
      await fetch(`${API_BASE?.trim()}/api/stream/stop`).catch(() => { });
      await fetch(`${API_BASE?.trim()}/api/stream/${symbol?.trim()}/start`).catch(() => { });
    };
    startStream();
    fetchOnce(symbol);
    timer.current = setInterval(() => fetchOnce(symbol), 5000);
    return () => {
      if (timer.current) clearInterval(timer.current);
      fetch(`${API_BASE?.trim()}/api/stream/stop`).catch(() => { });
    };
  }, [symbol]);

  // === Markdown output ===
  const markdown = useMemo(() => {
    if (!mm) return "Loading...";
    const m5 = mm.timeframes.M5;
    const ts = dayjs(mm.timestamp).format("YYYY-MM-DD HH:mm:ss");
    return `## 🧠 Đọc vị MM – Input (${ts})
- Pair: ${mm.symbol.replace("USDT", "/USDT")}
- Exchange: ${mm.exchange}
- TF: M5 / M15 / H1

### 📈 Giá & Volume
- Giá hiện tại: **${m5.price || "N/A"} USDT**
- Volume 24h: **${m5.volume24h || "N/A"}**

### 📊 Derivatives
- Funding Rate: **${m5.fundingRate || "N/A"}**
- Open Interest: **${m5.openInterest || "N/A"}**
- Long/Short Ratio: **${m5.longShortRatio || "N/A"}** (Long ${m5.longRatio || "-"} / Short ${m5.shortRatio || "-"})
- Liquidation Map: _(Check Hyblock / TensorCharts)_

### 💰 Volume & Delta
- Taker Buy Vol: **${m5.takerBuy || "Đang cập nhật..."}**
- Taker Sell Vol: **${m5.takerSell || "Đang cập nhật..."}**
- Δ (Buy−Sell): **${m5.delta || "Đang cập nhật..."}**

### 🧩 Chart Context
- (Cập nhật thủ công: cấu trúc giá, vùng thanh khoản, kháng cự/hỗ trợ)

### 🔍 **Yêu cầu phân tích:**
- Đọc vị MM ba khung (M5/M15/H1) để tìm điểm Long/Short tối ưu
- → Ưu tiên chiến lược Scalping (risk:reward 1:1.5)`;
  }, [mm]);

  // === UI ===
  return (
    <main style={{ minHeight: "100vh", background: "#0a0a0a", color: "#eee", padding: "1rem" }}>
      <div style={{ maxWidth: "1400px", margin: "0 auto" }}>
        <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
          <h1 style={{ fontSize: "1.5rem", fontWeight: "bold" }}>MM Dashboard — {symbol}</h1>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <input
              style={{ background: "#111", color: "#eee", border: "1px solid #444", borderRadius: "6px", padding: "6px 10px" }}
              value={symbol}
              onChange={(e) => setSymbol(e.target.value.toUpperCase())}
              placeholder="BTCUSDT"
            />
            <button
              onClick={() => fetchOnce(symbol)}
              style={{
                background: "#10b981",
                color: "white",
                border: "none",
                borderRadius: "6px",
                padding: "6px 14px",
                cursor: "pointer",
              }}
            >
              Refresh
            </button>
          </div>
        </header>

        {err && (
          <div style={{ background: "#451a1a", border: "1px solid #b91c1c", padding: "0.5rem", borderRadius: "8px" }}>
            Lỗi tải dữ liệu: {err}
          </div>
        )}

        {/* 3 biểu đồ song song */}
        {/* <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem", marginTop: "1rem" }}>
          <Card title="Funding Rate (%) — M5/M15/H1"><SeriesChart data={hist.funding} yLabel="%" /></Card>
          <Card title="Open Interest (USDT) — M5/M15/H1"><SeriesChart data={hist.oi} yLabel="USDT" /></Card>
          <Card title="Long/Short Ratio — M5/M15/H1"><SeriesChart data={hist.lsr} yLabel="ratio" /></Card>
        </div> */}

        {/* Markdown + Quick Info */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))", gap: "1rem", marginTop: "1.5rem" }}>
          <Card title="Markdown — Đọc vị MM (M5)">
            <div style={{ fontFamily: "Inter, Arial", fontSize: "0.9rem", lineHeight: 1.5, color: "#ddd" }}>
              <ReactMarkdown>{markdown}</ReactMarkdown>
            </div>
          </Card>
          <Card title="Thông tin nhanh (M5)">
            <ul style={{ listStyle: "none", padding: 0, lineHeight: "1.8" }}>
              <li>Giá: <b>{mm?.timeframes.M5.price ?? "-"}</b> USDT</li>
              <li>FR: <b>{mm?.timeframes.M5.fundingRate ?? "-"}</b></li>
              <li>OI: <b>{mm?.timeframes.M5.openInterest ?? "-"}</b></li>
              <li>LSR: <b>{mm?.timeframes.M5.longShortRatio ?? "-"}</b> (L {mm?.timeframes.M5.longRatio}, S {mm?.timeframes.M5.shortRatio})</li>
              <li>Δ: <b>{mm?.timeframes.M5.delta ?? "Đang cập nhật..."}</b></li>
              <li>Cập nhật: {mm ? dayjs(mm.timestamp).format("HH:mm:ss") : "-"}</li>
            </ul>
          </Card>
        </div>

        <footer style={{ marginTop: "1.5rem", fontSize: "0.8rem", color: "#999" }}>
          Auto refresh 5s • Nguồn {API_BASE}/api/mm/{symbol}
          {loading ? " • Đang tải..." : ""}
        </footer>
      </div>
    </main>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: "#111", border: "1px solid #333", borderRadius: "10px", padding: "1rem", boxShadow: "0 0 6px #000a" }}>
      <div style={{ fontSize: "0.9rem", opacity: 0.8, marginBottom: "0.5rem" }}>{title}</div>
      {children}
    </div>
  );
}

function SeriesChart({ data, yLabel }: { data: Point[]; yLabel?: string }) {
  if (!data.length)
    return <div style={{ height: 250, display: "flex", alignItems: "center", justifyContent: "center", opacity: 0.6 }}>Đang tải dữ liệu...</div>;
  return (
    <div style={{ width: "100%", minHeight: 250 }}>
      <ResponsiveContainer width="100%" height={250}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#333" />
          <XAxis dataKey="t" tick={{ fill: "#aaa", fontSize: 12 }} />
          <YAxis tick={{ fill: "#aaa", fontSize: 12 }} width={70} />
          <Tooltip contentStyle={{ background: "#111", border: "1px solid #333" }} />
          <Legend />
          <Line type="monotone" dataKey="M5" stroke="#22c55e" strokeWidth={1} dot={false} />
          <Line type="monotone" dataKey="M15" stroke="#3b82f6" strokeWidth={1} dot={false} />
          <Line type="monotone" dataKey="H1" stroke="#eab308" strokeWidth={1} dot={false} />
        </LineChart>
      </ResponsiveContainer>
      {yLabel && <div style={{ fontSize: "0.8rem", marginTop: 4, opacity: 0.6 }}>Đơn vị: {yLabel}</div>}
    </div>
  );
}
