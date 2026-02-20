import { useEffect, useState } from "react";
import { signOut } from "firebase/auth";
import { deleteDoc, doc } from "firebase/firestore";
import { getDeviceId } from "../services/deviceService";
import { useAuth } from "../context/AuthContext";
import {
  clearPushToken,
  getStoredPushToken,
  requestPushToken,
} from "../services/pushService";
import { ensurePushRegistration } from "../services/ensurePushRegistration";
import {
  getDoc,
  getDocs,
  setDoc,
  collection,
  query,
  where,
  onSnapshot,
  orderBy,
} from "firebase/firestore";
import { db, auth } from "../firebase";
import { API_BASE } from "../config/api";
import "./Dashboard.css";

export default function Dashboard() {
  const { user } = useAuth();
  const [slug, setSlug] = useState(null);
  const [searches, setSearches] = useState([]);
  const [copied, setCopied] = useState(false);
  const [username, setUsername] = useState(
    (auth.currentUser?.email || "").split("@")[0] || "Performer",
  );
  const [isActive, setIsActive] = useState(true);
  const [togglingActive, setTogglingActive] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [pushBusy, setPushBusy] = useState(false);
  const [pushToken, setPushToken] = useState(getStoredPushToken());

  useEffect(() => {
    let unsubscribe = () => {};

    const load = async () => {
      const userRef = doc(db, "users", auth.currentUser.uid);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        const profile = userSnap.data();
        const fallbackUsername =
          (auth.currentUser?.email || "").split("@")[0] || "Performer";
        setUsername(profile.username || fallbackUsername);
        setIsActive(profile.isActive !== false);
        setNotificationsEnabled(profile.notificationsEnabled === true);
        let userSlug = profile.slug;

        if (!userSlug) {
          const slugSnap = await getDocs(
            query(
              collection(db, "slugs"),
              where("uid", "==", auth.currentUser.uid),
            ),
          );
          if (!slugSnap.empty) {
            userSlug = slugSnap.docs[0].id;
            try {
              await setDoc(userRef, { slug: userSlug }, { merge: true });
            } catch (e) {
              console.error("Failed to backfill slug on user profile", e);
            }
          }
        }

        if (!userSlug) return;
        setSlug(userSlug);

        const q = query(
          collection(db, "searches"),
          where("slug", "==", userSlug),
          orderBy("time", "desc"),
        );

        unsubscribe = onSnapshot(
          q,
          (snap) => {
            const list = [];
            snap.forEach((d) => list.push({ id: d.id, ...d.data() }));
            setSearches(list);
          },
          (error) => {
            console.error(
              "Dashboard search listener error (check indexes?):",
              error,
            );
          },
        );
      }
    };

    load();
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    ensurePushRegistration(user);
  }, [user]);

  const logout = async () => {
    const uid = auth.currentUser.uid;
    const deviceId = getDeviceId();
    const token = getStoredPushToken();

    try {
      await deleteDoc(doc(db, "sessions", uid, "devices", deviceId));
    } catch (e) {
      console.error("Error removing session", e);
    }
    if (token) {
      try {
        const authToken = await auth.currentUser?.getIdToken();
        if (authToken) {
          await fetch(`${API_BASE}/push-settings`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${authToken}`,
            },
            body: JSON.stringify({ enabled: false, fcmToken: token }),
          });
        }
      } catch (e) {
        console.error("Error disabling push on logout", e);
      }
      try {
        await deleteDoc(doc(db, "devices", uid, "tokens", token));
      } catch (e) {
        console.error("Error removing push token doc", e);
      }
    }
    await clearPushToken();

    await signOut(auth);
    localStorage.removeItem("sessionVersion");
    localStorage.removeItem("savedEmail");
    localStorage.removeItem("savedPassword");
    window.location.href = "/login";
  };

  const copyLink = () => {
    const url = `${window.location.origin}/${slug}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const togglePerformerLink = async () => {
    try {
      setTogglingActive(true);
      const nextValue = !isActive;

      const authToken = await auth.currentUser?.getIdToken();
      if (!authToken) {
        throw new Error("Missing auth token");
      }

      const response = await fetch(`${API_BASE}/performer-link-status`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ enabled: nextValue }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to update link status");
      }

      const data = await response.json();
      setIsActive(data.isActive !== false);
    } catch (error) {
      console.error("Failed to update link status", error);
    } finally {
      setTogglingActive(false);
    }
  };

  const togglePushNotifications = async () => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;

    setPushBusy(true);
    try {
      const authToken = await auth.currentUser?.getIdToken();
      if (!authToken) {
        throw new Error("Missing auth token");
      }

      if (!notificationsEnabled) {
        const token = await requestPushToken();
        const response = await fetch(`${API_BASE}/push-settings`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify({ enabled: true, fcmToken: token }),
        });
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(
            errorData.message || "Failed to enable notifications",
          );
        }
        setPushToken(token);
        setNotificationsEnabled(true);
      } else {
        const tokenToDelete = pushToken || getStoredPushToken();
        const response = await fetch(`${API_BASE}/push-settings`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify({
            enabled: false,
            fcmToken: tokenToDelete || "",
          }),
        });
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(
            errorData.message || "Failed to disable notifications",
          );
        }
        await clearPushToken();
        setPushToken("");
        setNotificationsEnabled(false);
      }
    } catch (error) {
      console.error("Failed to toggle push notifications", error);
      if (!notificationsEnabled) {
        await clearPushToken();
        setPushToken("");
      }
      alert(error.message || "Unable to update push notifications.");
    } finally {
      setPushBusy(false);
    }
  };

  const formatSearchDateTime = (value) => {
    if (!value) return "--";
    let dateObj = null;

    if (typeof value?.toDate === "function") {
      dateObj = value.toDate();
    } else if (value?.seconds) {
      dateObj = new Date(value.seconds * 1000);
    } else {
      dateObj = new Date(value);
    }

    if (!(dateObj instanceof Date) || Number.isNaN(dateObj.getTime()))
      return "--";

    return dateObj.toLocaleString();
  };

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <div>
          <h1 className="dashboard-title">{username || "Performer"}</h1>
          <p className="dashboard-email">{auth.currentUser?.email}</p>

          <div className="header-link-row">
            <span className="header-link-url">
              {slug ? `${window.location.host}/${slug}` : "..."}
            </span>
            <button
              className={`copy-btn-small ${copied ? "copied" : ""}`}
              onClick={copyLink}
              disabled={!slug}
              title="Copy Link"
            >
              {copied ? "Copied" : "Copy"}
            </button>
          </div>

          <div className="link-toggle-row">
            <span className="link-toggle-title">Lock link</span>
            <button
              className={`link-switch ${!isActive ? "on" : "off"}`}
              onClick={togglePerformerLink}
              disabled={togglingActive}
              type="button"
              aria-label="Toggle performer link status"
              aria-pressed={!isActive}
            >
              <span className="link-switch-knob" />
            </button>
          </div>

          <div className="link-toggle-row">
            <span className="link-toggle-title">Push notifications</span>
            <button
              className={`link-switch ${notificationsEnabled ? "on" : "off"}`}
              onClick={togglePushNotifications}
              disabled={pushBusy}
              type="button"
              aria-label="Toggle push notifications"
              aria-pressed={notificationsEnabled}
            >
              <span className="link-switch-knob" />
            </button>
          </div>
        </div>

        <button onClick={logout} className="logout-btn">
          Sign Out
        </button>
      </header>

      <section className="history-section" style={{ marginBottom: "3rem" }}>
        <h2 className="history-title">Peak</h2>

        <div className="history-list">
          {searches.length === 0 ? (
            <div className="empty-state">Waiting for the first thought...</div>
          ) : (
            searches.map((s, i) => (
              <div
                key={s.id}
                className={`history-item ${i === 0 ? "latest" : ""}`}
              >
                <div className="search-term">{s.word}</div>
                <div className="history-item-meta">
                  <div className="search-time">
                    {formatSearchDateTime(s.time)}
                  </div>
                  {i === 0 && <div className="latest-badge">New</div>}
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
