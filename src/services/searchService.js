import { API_BASE } from "../config/api";

export async function saveSearchIfActive(slug, word) {
  if (!slug || !word) return false;

  try {
    const response = await fetch(`${API_BASE}/save-search`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ slug, word }),
    });

    if (!response.ok) {
      throw new Error(`Save search failed with status ${response.status}`);
    }

    const data = await response.json();
    return data?.saved === true;
  } catch (error) {
    console.error("Search save failed", error);
    return false;
  }
}
