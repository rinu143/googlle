import { useEffect, useState } from "react";
import { signOut } from "firebase/auth";
import { deleteDoc, doc } from "firebase/firestore";
import { getDeviceId } from "../services/deviceService";
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
import "./Dashboard.css";

export default function Dashboard() {
  const [slug, setSlug] = useState(null);
  const [searches, setSearches] = useState([]);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let unsubscribe = () => {};

    const load = async () => {
      // get performer profile
      const userRef = doc(db, "users", auth.currentUser.uid);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        let userSlug = userSnap.data().slug;

        // Backward compatibility: older users may not have slug on users/{uid}.
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

        // listen to ALL searches for this performer
        const q = query(
          collection(db, "searches"),
          where("slug", "==", userSlug),
          orderBy("time", "desc"),
        );

        unsubscribe = onSnapshot(q, (snap) => {
          const list = [];
          snap.forEach((d) => list.push({ id: d.id, ...d.data() }));
          setSearches(list);
        });
      }
    };

    load();
    return () => unsubscribe();
  }, []);

  const logout = async () => {
    const uid = auth.currentUser.uid;
    const deviceId = getDeviceId();

    // remove this device session
    try {
      await deleteDoc(doc(db, "sessions", uid, "devices", deviceId));
    } catch (e) {
      console.error("Error removing session", e);
    }

    await signOut(auth);
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

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <div>
          <h1 className="dashboard-title">Googlle</h1>
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
              {copied ? "✓" : "Copy"}
            </button>
          </div>
        </div>
        <button onClick={logout} className="logout-btn">
          Sign Out
        </button>
      </header>

      {/* History Section (Live Feed) - Prioritized */}
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
                {i === 0 && <div className="latest-badge">New</div>}
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
