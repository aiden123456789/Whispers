// src/app/api/subscribe/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { sendPushNotification } from '../../lib/webPush';
const webpush = require('web-push');

const subscriptions: PushSubscription[] = [];

export async function POST(req: NextRequest) {
  const sub = (await req.json()) as PushSubscription;
  subscriptions.push(sub); // In-memory; consider persisting in DB

  // Optional: send welcome notification
  await sendPushNotification(sub, {
    title: 'Subscribed!',
    body: 'You’ll now get whispers nearby.',
  });

  return NextResponse.json({ success: true });
}
