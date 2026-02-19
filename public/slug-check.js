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
    if (!res.ok) throw new Error("Slug status lookup failed");
    return res.json();
  }

  async function run() {
    const slug = getSlugFromPath();
    if (!slug) {
      window.__startReactApp();
      return;
    }

    try {
      const status = await getSlugStatus(slug);
      if (!status?.exists) {
        window.__startReactApp();
        return;
      }

      if (status.isActive === false) {
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
