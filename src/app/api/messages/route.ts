// src/app/api/messages/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getAllRecentMessages, saveMessage } from "../../lib/db";

export async function GET() {
  try {
    const msgs = await getAllRecentMessages(); // fetch all or many messages
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
