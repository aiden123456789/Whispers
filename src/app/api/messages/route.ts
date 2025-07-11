// src/app/api/messages/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getAllRecentMessages, saveMessage } from "../../lib/db";
import { containsSlur } from "../../lib/slurFilter";

// In-memory IP-based rate limiting
const ipTimestamps = new Map<string, number>();
const RATE_LIMIT_SECONDS = 60;

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

    if (text.length > 50) {
      return NextResponse.json(
        { error: "Message is too long (max 50 characters)" },
        { status: 400 }
      );
    }

    if (containsSlur(text)) {
      return NextResponse.json(
        { error: "Inappropriate language is not allowed." },
        { status: 400 }
      );
    }

    // Get IP address for rate limiting
    const ip = req.headers.get("x-forwarded-for")?.split(',')[0] ?? "unknown";
    const now = Date.now();
    const lastTime = ipTimestamps.get(ip) ?? 0;

    if (now - lastTime < RATE_LIMIT_SECONDS * 1000) {
      const secondsLeft = Math.ceil((RATE_LIMIT_SECONDS * 1000 - (now - lastTime)) / 1000);
      return NextResponse.json(
        { error: `Rate limit exceeded. Try again in ${secondsLeft}s.` },
        { status: 429 }
      );
    }

    // Save message and update timestamp
    ipTimestamps.set(ip, now);
    const saved = await saveMessage(text, lat, lng);
    return NextResponse.json(saved, { status: 201 });
  } catch (err) {
    console.error("POST /api/messages error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
