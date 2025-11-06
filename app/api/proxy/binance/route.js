import { NextResponse } from "next/server";

export async function GET(req) {
  const url = req.nextUrl.searchParams.get("url");
  if (!url)
    return NextResponse.json({ error: "Missing url param" }, { status: 400 });

  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "MM-Dashboard/1.0" },
      next: { revalidate: 0 },
    });

    const data = await res.json();

    return NextResponse.json(data, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
