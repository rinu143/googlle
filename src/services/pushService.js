import { deleteToken, getMessaging, getToken, isSupported } from "firebase/messaging";
import { app } from "../firebase";

const PUSH_TOKEN_KEY = "pushToken";

export function getStoredPushToken() {
  return localStorage.getItem(PUSH_TOKEN_KEY) || "";
}

export function clearStoredPushToken() {
  localStorage.removeItem(PUSH_TOKEN_KEY);
}

async function getMessagingOrThrow() {
  const supported = await isSupported();
  if (!supported) {
    throw new Error("Push notifications are not supported on this browser.");
  }
  return getMessaging(app);
}

export async function requestPushToken() {
  if (typeof window === "undefined" || !("Notification" in window)) {
    throw new Error("Notifications are not supported on this browser.");
  }

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    throw new Error("Notification permission was not granted.");
  }

  const messaging = await getMessagingOrThrow();
  const registration = await navigator.serviceWorker.register(
    "/firebase-messaging-sw.js",
  );
  await navigator.serviceWorker.ready;

  const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;
  if (!vapidKey) {
    throw new Error("Missing VITE_FIREBASE_VAPID_KEY.");
  }

  const token = await getToken(messaging, {
    vapidKey,
    serviceWorkerRegistration: registration,
  });

  if (!token) {
    throw new Error("Unable to get FCM token.");
  }

  localStorage.setItem(PUSH_TOKEN_KEY, token);
  return token;
}

export async function clearPushToken() {
  const token = getStoredPushToken();
  if (!token) return "";

  try {
    const messaging = await getMessagingOrThrow();
    await deleteToken(messaging);
  } catch (error) {
    console.error("Failed to delete FCM token from browser.", error);
  }

  clearStoredPushToken();
  return token;
}
