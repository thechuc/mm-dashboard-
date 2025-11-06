import { NextResponse } from "next/server";

export async function GET(req) {
    const url = req.nextUrl.searchParams.get("url");
    if (!url) return NextResponse.json({ error: "Missing url" }, { status: 400 });

    try {
        const res = await fetch(url, {
            headers: { "User-Agent": "MM-Dashboard/1.0" },
        });
        const data = await res.json();
        return NextResponse.json(data);
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
