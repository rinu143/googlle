(function () {
  const RESERVED_ROUTES = new Set([
    "",
    "login",
    "signup",
    "dashboard",
    "admin",
    "invalid",
  ]);

  function getSlugFromPath() {
    const path = window.location.pathname.replace(/^\/+|\/+$/g, "");
    if (!path) return null;
    if (path.includes("/")) return null;
    if (RESERVED_ROUTES.has(path)) return null;
    return path;
  }

  async function getPublicPerformer(slug) {
    const projectId = "mentalism-portal";
    const apiKey = "AIzaSyCERFbeqGpsN_jwN68nE1PxpFu4me8mir4";
    const url =
      `https://firestore.googleapis.com/v1/projects/${projectId}` +
      `/databases/(default)/documents/publicPerformers/${encodeURIComponent(slug)}` +
      `?key=${apiKey}`;
    const res = await fetch(url, { method: "GET" });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error("Public performer lookup failed");
    return res.json();
  }

  function getApiBase() {
    if (window.location.hostname === "localhost") return "http://localhost:3000";
    return "https://googlle-api.onrender.com";
  }

  async function getSlugStatus(slug) {
    const apiBase = getApiBase();
    const res = await fetch(
      `${apiBase}/slug-status/${encodeURIComponent(slug)}`,
      { method: "GET" },
    );
    if (!res.ok) return null;
    return res.json();
  }

  async function run() {
    const slug = getSlugFromPath();
    if (!slug) {
      window.__startReactApp();
      return;
    }

    try {
      const doc = await getPublicPerformer(slug);
      const enabled = doc?.fields?.enabled?.booleanValue;
      if (enabled === false) {
        window.location.replace("https://www.google.com");
        return;
      }

      const status = await getSlugStatus(slug);
      if (status?.exists && status?.isActive === false) {
        window.location.replace("https://www.google.com");
        return;
      }

      window.__startReactApp();
    } catch (error) {
      console.error("Slug check failed:", error);
      window.__startReactApp();
    }
  }

  run();
})();
