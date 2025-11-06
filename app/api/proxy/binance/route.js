import { NextResponse } from "next/server";

/**
 * Proxy Binance API — giúp bypass lỗi 451 khi gọi trực tiếp từ server (US/EU)
 * => Trình duyệt gọi proxy này, Netlify chỉ forward sang Binance.
 */
export async function GET(req) {
  const url = req.nextUrl.searchParams.get("url");
  if (!url) {
    return NextResponse.json({ error: "Missing url param" }, { status: 400 });
  }

  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "MM-Dashboard/1.0" },
    });

    if (!res.ok) {
      return NextResponse.json({ error: `Upstream error ${res.status}` }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
