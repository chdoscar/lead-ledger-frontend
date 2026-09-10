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