import { NextRequest, NextResponse } from 'next/server';
import { getNearbyMessages, saveMessage } from '../../lib/db';

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const lat = Number(url.searchParams.get('lat'));
  const lng = Number(url.searchParams.get('lng'));
  const radius = Number(url.searchParams.get('radius')) || 50;

  if (isNaN(lat) || isNaN(lng)) {
    return NextResponse.json({ error: 'Invalid or missing lat/lng' }, { status: 400 });
  }

  const messages = getNearbyMessages(lat, lng, radius);
  return NextResponse.json(messages);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { text, lat, lng } = body;

  if (
    typeof text !== 'string' ||
    typeof lat !== 'number' ||
    typeof lng !== 'number' ||
    !text.trim()
  ) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const saved = saveMessage(text.trim(), lat, lng);
  return NextResponse.json(saved, { status: 201 });
}
