import { addDoc, collection, doc, getDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";
import { API_BASE } from "../config/api";

export async function saveSearchIfActive(slug, word) {
  if (!slug || !word) return false;

  const slugSnap = await getDoc(doc(db, "slugs", slug));
  if (!slugSnap.exists()) return false;

  const uid = slugSnap.data()?.uid;
  if (!uid) return false;

  const userSnap = await getDoc(doc(db, "users", uid));
  if (!userSnap.exists()) return false;

  const isActive = userSnap.data()?.isActive;
  if (isActive === false) return false;
  const notificationsEnabled = userSnap.data()?.notificationsEnabled === true;

  await addDoc(collection(db, "searches"), {
    slug,
    word,
    time: serverTimestamp(),
  });

  if (notificationsEnabled) {
    fetch(`${API_BASE}/push-search`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ uid, word }),
    }).catch((error) => {
      console.error("Push request failed", error);
    });
  }

  return true;
}
