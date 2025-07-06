// src/app/api/messages/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getNearbyMessages, saveMessage } from "../../lib/db";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const lat = Number(url.searchParams.get("lat"));
  const lng = Number(url.searchParams.get("lng"));

  if (Number.isNaN(lat) || Number.isNaN(lng)) {
    return NextResponse.json({ error: "Missing lat/lng" }, { status: 400 });
  }

  try {
    const msgs = await getNearbyMessages(lat, lng);
    return NextResponse.json(msgs);
  } catch (err) {
    console.error("GET /api/messages error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { text, lat, lng } = await req.json();
    if (!text || lat == null || lng == null) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }
    const saved = await saveMessage(text, lat, lng);
    return NextResponse.json(saved, { status: 201 });
  } catch (err) {
    console.error("POST /api/messages error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
