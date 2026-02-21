import { doc, getDoc } from "firebase/firestore";
import { db } from "./firebase";
const API_BASE = import.meta.env.VITE_API_BASE;

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

    // Fallback source of truth in case public doc is stale/missing.
    const statusRes = await fetch(
      `${API_BASE}/slug-status/${encodeURIComponent(slug)}`,
      { method: "GET" },
    );
    if (statusRes.ok) {
      const status = await statusRes.json();
      if (status?.exists && status?.isActive === false) {
        window.location.replace("https://www.google.com");
        return false;
      }
    }

    return true;
  } catch (error) {
    console.error("Slug gate check failed:", error);
    return true;
  }
}
