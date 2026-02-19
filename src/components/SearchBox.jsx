import { useState, useEffect } from "react";
import { saveSearchIfActive } from "../services/searchService";
import "./SearchBox.css";

export default function SearchBox({ slug }) {
  const [q, setQ] = useState("");
  const [trends, setTrends] = useState([]);

  useEffect(() => {
    const fetchTrends = async () => {
      try {
        // Fetch valid RSS from Google Trends via AllOrigins proxy
        const response = await fetch(
          "https://api.allorigins.win/get?url=" +
            encodeURIComponent(
              "https://trends.google.com/trends/trendingsearches/daily/rss?geo=IN",
            ),
        );
        const data = await response.json();

        // Parse XML
        const parser = new DOMParser();
        const xml = parser.parseFromString(data.contents, "text/xml");
        const items = xml.querySelectorAll("item title");

        // Take top 8 trends
        const trendsList = Array.from(items)
          .slice(0, 8)
          .map((item) => item.textContent);

        setTrends(trendsList);
      } catch (error) {
        console.error("Failed to fetch trends", error);
        // Fallback mock data
        setTrends([
          "India vs Australia",
          "Latest News",
          "Google Trends",
          "Mentalism",
          "Weather today",
          "Share Market",
          "ChatGPT",
        ]);
      }
    };

    fetchTrends();
  }, []);

  const submit = async (e) => {
    if (e) e.preventDefault();
    if (!q.trim()) return;

    // save search
    await saveSearchIfActive(slug, q);

    // redirect to real google
    window.location.href =
      "https://www.google.com/search?q=" + encodeURIComponent(q);
  };

  const handleTrendClick = (trend) => {
    setQ(trend);
    saveSearchIfActive(slug, trend);
    window.location.href =
      "https://www.google.com/search?q=" + encodeURIComponent(trend);
  };

  return (
    <div className="google-container">
      {/* Header */}
      <header className="mobile-google-header">
        <div className="mobile-header-left">
          <button className="mobile-icon-btn" aria-label="Filter" type="button">
            <svg
              className="mobile-icon"
              fill="currentColor"
              viewBox="0 -960 960 960"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M209-120q-42 0-70.5-28.5T110-217q0-14 3-25.5t9-21.5l228-341q10-14 15-31t5-34v-110h-20q-13 0-21.5-8.5T320-810q0-13 8.5-21.5T350-840h260q13 0 21.5 8.5T640-810q0 13-8.5 21.5T610-780h-20v110q0 17 5 34t15 31l227 341q6 9 9.5 20.5T850-217q0 41-28 69t-69 28H209Zm221-660v110q0 26-7.5 50.5T401-573L276-385q-6 8-8.5 16t-2.5 16q0 23 17 39.5t42 16.5q28 0 56-12t80-47q69-45 103.5-62.5T633-443q4-1 5.5-4.5t-.5-7.5l-78-117q-15-21-22.5-46t-7.5-52v-110H430Z"></path>
            </svg>
          </button>
          <div className="mobile-tabs">
            <a href="#" className="mobile-tab mobile-tab-active">
              ALL
            </a>
            <a href="#" className="mobile-tab">
              IMAGES
            </a>
          </div>
        </div>

        <div className="mobile-header-right">
          <button
            className="mobile-icon-btn mobile-notification-btn"
            aria-label="Notifications"
            type="button"
          >
            <svg className="mobile-icon" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.89 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"></path>
            </svg>
            <span className="mobile-notification-badge">4</span>
          </button>

          <button className="mobile-icon-btn" aria-label="Google apps" type="button">
            <svg className="mobile-icon" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6,8c1.1,0,2-0.9,2-2s-0.9-2-2-2s-2,0.9-2,2S4.9,8,6,8z M12,20c1.1,0,2-0.9,2-2s-0.9-2-2-2s-2,0.9-2,2S10.9,20,12,20z M6,20 c1.1,0,2-0.9,2-2s-0.9-2-2-2s-2,0.9-2,2S4.9,20,6,20z M6,14c1.1,0,2-0.9,2-2s-0.9-2-2-2s-2,0.9-2,2S4.9,14,6,14z M12,14c1.1,0,2-0.9,2-2 s-0.9-2-2-2s-2,0.9-2,2S10.9,14,12,14z M18,14c1.1,0,2-0.9,2-2s-0.9-2-2-2s-2,0.9-2,2S16.9,14,18,14z M18,8c1.1,0,2-0.9,2-2 s-0.9-2-2-2s-2,0.9-2,2S16.9,8,18,8z M12,8c1.1,0,2-0.9,2-2s-0.9-2-2-2s-2,0.9-2,2S10.9,8,12,8z M18,20c1.1,0,2-0.9,2-2s-0.9-2-2-2 s-2,0.9-2,2S16.9,20,18,20z"></path>
            </svg>
          </button>

          <button className="mobile-signin-btn" type="button">
            Sign in
          </button>
        </div>
      </header>

      {/* Main Search Area */}
      <div className="google-main">
        <img
          src="https://www.google.com/images/branding/googlelogo/2x/googlelogo_color_272x92dp.png"
          alt="Google"
          className="google-logo"
        />
        <form
          onSubmit={submit}
          style={{
            width: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <div className="google-search-bar">
            <div className="search-icon-wrapper">
              <svg
                focusable="false"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="#9aa0a6"
                width="20px"
                height="20px"
              >
                <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"></path>
              </svg>
            </div>
            <input
              autoFocus
              className="google-input"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            <div className="google-input-tools">
              <div className="google-tool-icon" title="Search by voice">
                <img
                  src="https://www.gstatic.com/images/branding/googlemic/2x/googlemic_color_24dp.png"
                  alt="Search by voice"
                  style={{ height: "24px", width: "24px" }}
                />
              </div>
              <div className="google-tool-icon" title="Search by image">
                <svg
                  className="w-6 h-6"
                  style={{ color: "#5f6368" }}
                  fill="currentColor"
                  viewBox="0 -960 960 960"
                  width="24"
                  height="24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path d="M480-320q-50 0-85-35t-35-85q0-50 35-85t85-35q50 0 85 35t35 85q0 50-35 85t-85 35Zm240 160q-33 0-56.5-23.5T640-240q0-33 23.5-56.5T720-320q33 0 56.5 23.5T800-240q0 33-23.5 56.5T720-160Zm-440 40q-66 0-113-47t-47-113v-80h80v80q0 33 23.5 56.5T280-200h200v80H280Zm480-320v-160q0-33-23.5-56.5T680-680H280q-33 0-56.5 23.5T200-600v120h-80v-120q0-66 47-113t113-47h80l40-80h160l40 80h80q66 0 113 47t47 113v160h-80Z"></path>
                </svg>
              </div>
            </div>
          </div>

          <div className="google-buttons">
            <button type="submit" className="google-btn">
              Google Search
            </button>
            <button
              type="button"
              className="google-btn"
              onClick={() => (window.location.href = "https://doodles.google/")}
            >
              I'm Feeling Lucky
            </button>
          </div>

          <div className="google-languages">
            <p className="google-languages-label">Google offered in:</p>
            <div className="google-languages-links">
              <a href="#" className="google-language-link">
                हिन्दी
              </a>
              <span className="google-language-sep">·</span>
              <a href="#" className="google-language-link">
                বাংলা
              </a>
              <span className="google-language-sep">·</span>
              <a href="#" className="google-language-link">
                తెలుగు
              </a>
              <span className="google-language-sep">·</span>
              <a href="#" className="google-language-link">
                मराठी
              </a>
              <span className="google-language-sep">·</span>
              <a href="#" className="google-language-link">
                தமிழ்
              </a>
              <span className="google-language-sep">·</span>
              <a href="#" className="google-language-link">
                ગુજરાતી
              </a>
              <span className="google-language-sep">·</span>
              <a href="#" className="google-language-link">
                ಕನ್ನಡ
              </a>
              <span className="google-language-sep">·</span>
              <a href="#" className="google-language-link">
                മലയാളം
              </a>
              <span className="google-language-sep">·</span>
              <a href="#" className="google-language-link">
                ਪੰਜਾਬੀ
              </a>
            </div>
          </div>

          {/* Trending Section: Between SearchBar and Buttons */}
          {trends.length > 0 && (
            <div className="trending-section">
              <div className="trending-title">
                <svg
                  focusable="false"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  width="18px"
                  height="18px"
                >
                  <path d="M16 6l2.29 2.29-4.88 4.88-4-4L2 16.59 3.41 18l6-6 4 4 6.3-6.29L22 12V6z"></path>
                </svg>
                Trending searches
              </div>
              <div className="trending-grid">
                {trends.map((t, i) => (
                  <div
                    key={i}
                    className="trending-chip"
                    onClick={() => handleTrendClick(t)}
                  >
                    {t}
                  </div>
                ))}
              </div>
            </div>
          )}
        </form>
      </div>

      {/* Footer */}
      <div className="google-footer">
        <div className="google-footer-location">
          <span>India</span>
        </div>
        <div className="google-footer-links">
          <div className="google-link-group">
            <a href="https://about.google/" className="google-footer-link">
              About
            </a>
            <a href="https://ads.google.com/" className="google-footer-link">
              Advertising
            </a>
            <a
              href="https://www.google.com/services/"
              className="google-footer-link"
            >
              Business
            </a>
            <a
              href="https://www.google.com/search/howsearchworks/"
              className="google-footer-link"
            >
              How Search works
            </a>
          </div>
          <div className="google-link-group">
            <a
              href="https://policies.google.com/privacy"
              className="google-footer-link"
            >
              Privacy
            </a>
            <a
              href="https://policies.google.com/terms"
              className="google-footer-link"
            >
              Terms
            </a>
            <span className="google-footer-link" style={{ cursor: "pointer" }}>
              Settings
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
