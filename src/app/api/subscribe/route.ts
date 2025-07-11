// src/app/api/subscribe/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { sendPushNotification } from '../../lib/webPush';

let subscriptions: any[] = [];

export async function POST(req: NextRequest) {
  const sub = await req.json();
  subscriptions.push(sub); // store in memory or DB

  // Optional: send welcome notification
  await sendPushNotification(sub, {
    title: 'Subscribed!',
    body: 'You’ll now get whispers nearby.',
  });

  return NextResponse.json({ success: true });
}
