// Minimal service worker for local notifications on mobile
// Only handles notification click — no push subscription needed

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url;
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Focus existing tab if found
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin)) {
          client.focus();
          if (url) client.postMessage({ type: 'navigate', url });
          return;
        }
      }
      // Open new tab if none found
      if (clients.openWindow) {
        return clients.openWindow(url || '/');
      }
    })
  );
});
