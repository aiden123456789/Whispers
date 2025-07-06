// src/app/api/messages/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getNearbyMessages, saveMessage } from "../../lib/db";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const lat = parseFloat(searchParams.get("lat") || "0");
  const lng = parseFloat(searchParams.get("lng") || "0");

  if (!lat || !lng) {
    return NextResponse.json({ error: "Missing lat or lng" }, { status: 400 });
  }

  try {
    const messages = await getNearbyMessages(lat, lng);
    return NextResponse.json(messages);
  } catch {
    return NextResponse.json({ error: "Failed to fetch messages" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { text, lat, lng } = await request.json();

    if (!text || !lat || !lng) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const saved = await saveMessage(text, lat, lng);
    return NextResponse.json(saved);
  } catch {
    return NextResponse.json({ error: "Failed to save message" }, { status: 500 });
  }
}
