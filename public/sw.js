self.addEventListener('push', function (event) {
  const data = event.data?.json?.() ?? { title: 'Whisper', body: 'You have a new message!' };

  const options = {
    body: data.body,
    vibrate: [200, 100, 200], // pattern: vibrate 200ms, pause 100ms, vibrate 200ms
    requireInteraction: true, // keeps it on screen until dismissed
    data: {
      url: data.url || '/', // fallback for clicking notification
    },
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Optional: handle click to open the site
self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data.url)
  );
});
