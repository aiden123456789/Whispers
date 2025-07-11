self.addEventListener('push', function (event) {
  const data = event.data.json();
  const options = {
    body: data.body,
    icon: '/icon.png',
    badge: '/badge.png',
    vibrate: [100, 50, 100], // vibrate pattern: vibrate 100ms, pause 50ms, vibrate 100ms
    requireInteraction: true, // notification stays until user interacts
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});
