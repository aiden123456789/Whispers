import webpush from 'web-push';
import type { PushSubscription } from 'web-push';

const vapidKeys = {
  publicKey: process.env.VAPID_PUBLIC_KEY!,
  privateKey: process.env.VAPID_PRIVATE_KEY!,
};

webpush.setVapidDetails(
  'mailto:your@email.com', // can be any contact email
  vapidKeys.publicKey,
  vapidKeys.privateKey
);

type NotificationPayload = {
  title: string;
  body: string;
};

export async function sendPushNotification(
  subscription: PushSubscription,
  payload: NotificationPayload
) {
  const data = JSON.stringify({
    notification: {
      title: payload.title,
      body: payload.body,
      icon: '/icon.png', // Optional: your app icon
    },
  });

  await webpush.sendNotification(subscription, data);
}
