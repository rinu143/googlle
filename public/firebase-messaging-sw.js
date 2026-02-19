/* global importScripts, firebase */
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
  self.registration.showNotification(title, {
    body: "",
    tag: "latest-search",
    renotify: true,
  });
});
