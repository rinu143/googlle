import { useEffect, useState } from "react";
import { sendPasswordResetEmail, signOut } from "firebase/auth";
import {
  collection,
  getDocs,
  setDoc,
  doc,
  deleteDoc,
  getDoc,
} from "firebase/firestore";
import { auth, db } from "../firebase";
import { getDeviceId } from "../services/deviceService";
import { API_BASE } from "../config/api";
import "./Admin.css";

export default function Admin() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [performers, setPerformers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [signupPrice, setSignupPrice] = useState("");
  const [savingPrice, setSavingPrice] = useState(false);

  const loadPerformers = async () => {
    const [usersSnap, slugsSnap] = await Promise.all([
      getDocs(collection(db, "users")),
      getDocs(collection(db, "slugs")),
    ]);

    const slugByUid = {};
    slugsSnap.forEach((d) => {
      const uid = d.data()?.uid;
      if (uid) slugByUid[uid] = d.id;
    });

    const list = [];
    usersSnap.forEach((d) => {
      if (d.data().role === "performer") {
        const performerEmail = d.data().email || "";
        const fallbackUsername = performerEmail.split("@")[0] || "user";
        list.push({
          id: d.id,
          ...d.data(),
          username: d.data().username || fallbackUsername,
          slug: d.data().slug || slugByUid[d.id] || "",
        });
      }
    });
    setPerformers(list);
  };

  const loadSignupPrice = async () => {
    const configSnap = await getDoc(doc(db, "config", "app"));
    if (configSnap.exists()) {
      setSignupPrice(String(configSnap.data().signupPrice ?? ""));
    }
  };

  useEffect(() => {
    loadPerformers();
    loadSignupPrice();
  }, []);

  const create = async () => {
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedPhone = phone.trim();
    const normalizedUsername = username.trim();

    if (!normalizedUsername || !normalizedEmail || !/^\d{10}$/.test(normalizedPhone)) {
      alert("Enter username, valid email and 10 digit phone number.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/admin-create-user`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: normalizedUsername,
          email: normalizedEmail,
          phone: normalizedPhone,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to create performer.");
      }

      alert("Performer created successfully. Credentials sent by email.");
      setUsername("");
      setEmail("");
      setPhone("");
      loadPerformers();
    } catch (error) {
      console.error(error);
      alert(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const saveSignupPrice = async () => {
    const parsedPrice = Number(signupPrice);
    if (!parsedPrice || parsedPrice <= 0) {
      alert("Enter a valid signup price.");
      return;
    }

    setSavingPrice(true);
    try {
      await setDoc(
        doc(db, "config", "app"),
        { signupPrice: parsedPrice },
        { merge: true },
      );
      alert("Signup price updated.");
    } catch (error) {
      console.error(error);
      alert(`Error: ${error.message}`);
    } finally {
      setSavingPrice(false);
    }
  };

  const remove = async (id) => {
    if (!confirm("Are you sure you want to delete this performer?")) return;

    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) {
        throw new Error("You are not authenticated.");
      }

      const response = await fetch(`${API_BASE}/admin-delete-user/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to delete performer.");
      }

      setPerformers((prev) => prev.filter((p) => p.id !== id));
    } catch (error) {
      console.error(error);
      alert(`Error: ${error.message}`);
    }
  };

  const resetPassword = async (performerEmail) => {
    try {
      await sendPasswordResetEmail(auth, performerEmail);
      alert(`Password reset email sent to ${performerEmail}`);
    } catch (e) {
      alert(e.message);
    }
  };

  const togglePerformerStatus = async (performer) => {
    try {
      const currentlyActive = performer.isActive !== false;
      const nextActive = !currentlyActive;
      const nextSessionVersion = nextActive
        ? 1
        : Number(performer.sessionVersion ?? 1) + 1;

      await setDoc(
        doc(db, "users", performer.id),
        {
          isActive: nextActive,
          sessionVersion: nextSessionVersion,
        },
        { merge: true },
      );
      if (performer.slug) {
        await setDoc(
          doc(db, "publicPerformers", performer.slug),
          { enabled: nextActive },
          { merge: true },
        );
      }

      setPerformers((prev) =>
        prev.map((p) =>
          p.id === performer.id
            ? {
                ...p,
                isActive: nextActive,
                sessionVersion: nextSessionVersion,
              }
            : p,
        ),
      );
    } catch (error) {
      console.error(error);
      alert(`Error: ${error.message}`);
    }
  };

  const logout = async () => {
    const uid = auth.currentUser?.uid;
    const deviceId = getDeviceId();

    if (uid) {
      try {
        await deleteDoc(doc(db, "sessions", uid, "devices", deviceId));
      } catch (e) {
        console.error("Error removing session", e);
      }
    }

    await signOut(auth);
    localStorage.removeItem("sessionVersion");
    localStorage.removeItem("savedEmail");
    localStorage.removeItem("savedPassword");
    window.location.href = "/login";
  };

  return (
    <div className="admin-container">
      <main className="admin-main">
        <header className="admin-header">
          <div>
            <h1 className="admin-title">Admin</h1>
            <p className="admin-subtitle">
              Manage performers and access control.
            </p>
          </div>
          <button onClick={logout} className="admin-logout">
            Logout
          </button>
        </header>

        <div className="admin-grid">
          <div className="admin-card admin-card-wide">
            <div className="admin-card-header">
              <h3 className="admin-card-title">Create Performer</h3>
            </div>
            <div className="admin-form">
              <input
                className="admin-input"
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
              <input
                className="admin-input"
                placeholder="Email Address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <input
                className="admin-input"
                placeholder="Phone Number"
                value={phone}
                onChange={(e) =>
                  setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))
                }
              />
              <button className="admin-btn" onClick={create} disabled={loading}>
                {loading ? "Creating..." : "Create Account"}
              </button>
            </div>
          </div>

          <div className="admin-card">
            <div className="admin-card-header">
              <h3 className="admin-card-title">Signup Pricing</h3>
            </div>
            <div className="admin-form">
              <input
                className="admin-input"
                type="number"
                min="1"
                placeholder="Signup Price (INR)"
                value={signupPrice}
                onChange={(e) => setSignupPrice(e.target.value)}
              />
              <button
                className="admin-btn"
                onClick={saveSignupPrice}
                disabled={savingPrice}
              >
                {savingPrice ? "Saving..." : "Save Price"}
              </button>
            </div>
          </div>

          <div className="admin-card">
            <div className="admin-card-header">
              <h3 className="admin-card-title">
                Performers ({performers.length})
              </h3>
            </div>
            <div className="performer-list">
              {performers.length === 0 ? (
                <p style={{ color: "#6b7280", textAlign: "center" }}>
                  No performers found.
                </p>
              ) : (
                performers.map((p) => (
                  <div key={p.id} className="performer-item">
                    <div className="performer-info">
                      <span className="performer-email">{p.username || (p.email || "").split("@")[0]}</span>
                      <span className="performer-email">{p.email}</span>
                      <span className="performer-phone">
                        {p.phone || "No phone"}
                      </span>
                      <span className="performer-phone">
                        Source: {p.createdBy === "admin" ? "Admin" : "Paid"}
                      </span>
                      <span className="performer-phone">
                        Status: {p.isActive === false ? "Disabled" : "Active"}
                      </span>
                      {p.slug ? (
                        <a
                          href={`/${p.slug}`}
                          target="_blank"
                          rel="noreferrer"
                          className="performer-link"
                        >
                          {window.location.origin}/{p.slug} 
                        </a>
                      ) : (
                        <span className="performer-link">Slug missing</span>
                      )}
                    </div>
                    <div className="performer-actions">
                      <button
                        className="btn-secondary"
                        onClick={() => resetPassword(p.email)}
                        title="Send Reset Password Email"
                      >
                        Reset
                      </button>
                      <button
                        className="btn-secondary"
                        onClick={() => togglePerformerStatus(p)}
                        title="Toggle account status"
                      >
                        {p.isActive === false ? "Activate" : "Disable"}
                      </button>
                      <button
                        className="btn-danger"
                        onClick={() => remove(p.id)}
                        title="Delete User"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
