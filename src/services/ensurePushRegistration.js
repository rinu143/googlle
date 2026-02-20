import { collection, doc, getDoc, getDocs } from "firebase/firestore";
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

    const ref = collection(db, "devices", user.uid, "tokens");
    const snap = await getDocs(ref);

    // Old user: no tokens stored yet
    if (snap.empty) {
      console.log("FCM: registering legacy user device");
      await registerForPush({ silent: true });
    }
  } catch (e) {
    console.log("FCM ensure skipped:", e.message);
  }
}
