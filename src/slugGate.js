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
    const publicPerformerSnap = await getDoc(doc(db, "publicPerformers", slug));
    if (publicPerformerSnap.exists() && publicPerformerSnap.data()?.enabled === false) {
      window.location.replace("https://www.google.com");
      return false;
    }

    return true;
  } catch (error) {
    console.error("Slug gate check failed:", error);
    return true;
  }
}
