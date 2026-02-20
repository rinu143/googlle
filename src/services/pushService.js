import { deleteToken, getMessaging, getToken, isSupported } from "firebase/messaging";
import { auth, db } from "../firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { app } from "../firebase";

const PUSH_TOKEN_KEY = "pushToken";
const PUSH_SILENT_DENIED_KEY = "pushSilentDenied";

export function getStoredPushToken() {
  return localStorage.getItem(PUSH_TOKEN_KEY) || "";
}

export function clearStoredPushToken() {
  localStorage.removeItem(PUSH_TOKEN_KEY);
}

export function getSilentDeniedFlag() {
  return localStorage.getItem(PUSH_SILENT_DENIED_KEY) === "1";
}

async function getMessagingOrThrow() {
  const supported = await isSupported();
  if (!supported) {
    throw new Error("Push notifications are not supported on this browser.");
  }
  return getMessaging(app);
}

export async function registerForPush(options = {}) {
  const { silent = false } = options;
  if (typeof window === "undefined" || !("Notification" in window)) {
    if (silent) return "";
    throw new Error("Notifications are not supported on this browser.");
  }

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    if (silent) {
      localStorage.setItem(PUSH_SILENT_DENIED_KEY, "1");
    }
    if (silent) return "";
    throw new Error("Notification permission was not granted.");
  }
  localStorage.removeItem(PUSH_SILENT_DENIED_KEY);

  const user = auth.currentUser;
  if (!user?.uid) {
    if (silent) return "";
    throw new Error("User not authenticated.");
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
    if (silent) return "";
    throw new Error("Unable to get FCM token.");
  }

  const tokenRef = doc(db, "devices", user.uid, "tokens", token);
  const tokenSnap = await getDoc(tokenRef);
  if (!tokenSnap.exists()) {
    await setDoc(
      tokenRef,
      {
        uid: user.uid,
        createdAt: Date.now(),
      },
      { merge: true },
    );
  }

  localStorage.setItem(PUSH_TOKEN_KEY, token);
  return token;
}

export async function requestPushToken() {
  return registerForPush();
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
