import { doc, getDoc } from "firebase/firestore";
import { db } from "./firebase";

const RESERVED_ROUTES = new Set(["", "login", "signup", "dashboard", "admin", "invalid"]);

function getSlugFromPath() {
  const path = window.location.pathname.replace(/^\/+|\/+$/g, "");
  if (!path) return null;
  if (path.includes("/")) return null;
  if (RESERVED_ROUTES.has(path)) return null;
  return path;
}

export async function verifySlugBeforeRender() {
  const slug = getSlugFromPath();
  if (!slug) return true;

  try {
    const slugSnap = await getDoc(doc(db, "slugs", slug));
    if (!slugSnap.exists()) return true;

    const uid = slugSnap.data()?.uid;
    if (!uid) return true;

    const userSnap = await getDoc(doc(db, "users", uid));
    if (!userSnap.exists()) return true;

    if (userSnap.data()?.isActive === false) {
      window.location.replace("https://www.google.com");
      return false;
    }

    return true;
  } catch (error) {
    console.error("Slug gate check failed:", error);
    return true;
  }
}
