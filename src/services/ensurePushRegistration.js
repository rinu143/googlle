import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import { getSilentDeniedFlag, registerForPush } from "./pushService";

export async function ensurePushRegistration(user) {
  if (!user) return;

  try {
    if (typeof Notification !== "undefined") {
      if (Notification.permission === "granted") {
        localStorage.removeItem("pushSilentDenied");
      } else if (getSilentDeniedFlag()) {
        return;
      }
    }

    const settingsSnap = await getDoc(doc(db, "userSettings", user.uid));
    if (settingsSnap.exists() && settingsSnap.data()?.notificationsEnabled === false) {
      return;
    }

    // Self-heal token state on login/refresh when notifications are enabled.
    await registerForPush({ silent: true });
  } catch (e) {
    if (
      e?.code === "permission-denied" ||
      String(e?.message || "").includes("Missing or insufficient permissions")
    ) {
      return;
    }
    console.log("FCM ensure skipped:", e.message);
  }
}
