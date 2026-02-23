/* global importScripts, firebase */
self.__SW_VERSION = "v3";
importScripts("https://www.gstatic.com/firebasejs/12.9.0/firebase-app-compat.js");
importScripts(
  "https://www.gstatic.com/firebasejs/12.9.0/firebase-messaging-compat.js",
);

firebase.initializeApp({
  apiKey: "AIzaSyCERFbeqGpsN_jwN68nE1PxpFu4me8mir4",
  authDomain: "mentalism-portal.firebaseapp.com",
  projectId: "mentalism-portal",
  storageBucket: "mentalism-portal.firebasestorage.app",
  messagingSenderId: "255169478966",
  appId: "1:255169478966:web:ab41100f0ca1f3b54f7397",
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const title = payload?.notification?.title || "New search";
  const icon = "/assets/google-logo-icon-gsuite-hd-701751694791470gzbayltphh.png";
  self.registration.showNotification(title, {
    body: "",
    tag: "latest-search",
    renotify: true,
    icon,
    badge: icon,
    data: {
      url: "/dashboard",
    },
  });
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification?.data?.url || "/dashboard";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      const existing = list.find((client) => "focus" in client);
      if (existing) {
        existing.postMessage({ type: "OPEN_DASHBOARD", url: targetUrl });
        return existing.focus();
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
      return null;
    }),
  );
});
