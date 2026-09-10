// Runs separately from the app's main JS, in the background — this is
// what lets a notification show up even when the app tab is closed or the
// phone screen is locked. The browser/OS wakes this up when a push
// arrives, regardless of what the app itself is doing.

self.addEventListener("push", (event) => {
  let payload = { title: "Lead Ledger", body: "You have a new update." };
  try {
    if (event.data) payload = event.data.json();
  } catch {
    // Not JSON — fall back to the default above.
  }

  event.waitUntil(
    self.registration.showNotification(payload.title || "Lead Ledger", {
      body: payload.body || "",
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      tag: payload.tag,
      requireInteraction: true,
      vibrate: [200, 100, 200, 100, 200],
    })
  );
});

// Tapping the notification brings the app to the front (or opens it if
// it's not running), instead of just dismissing.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ("focus" in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow("/");
    })
  );
});
