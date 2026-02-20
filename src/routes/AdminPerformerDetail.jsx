import { useEffect, useState } from "react";
import { sendPasswordResetEmail } from "firebase/auth";
import { collection, deleteDoc, doc, getDoc, getDocs, query, where } from "firebase/firestore";
import { useNavigate, useParams } from "react-router-dom";
import { auth, db } from "../firebase";
import { API_BASE } from "../config/api";
import "./Admin.css";

export default function AdminPerformerDetail() {
  const { uid } = useParams();
  const nav = useNavigate();
  const [performer, setPerformer] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadPerformer = async () => {
    setLoading(true);
    try {
      const userSnap = await getDoc(doc(db, "users", uid));
      if (!userSnap.exists() || userSnap.data()?.role !== "performer") {
        setPerformer(null);
        setLoading(false);
        return;
      }

      const data = userSnap.data();
      let slug = data.slug || "";
      if (!slug) {
        const slugSnap = await getDocs(
          query(collection(db, "slugs"), where("uid", "==", uid)),
        );
        if (!slugSnap.empty) slug = slugSnap.docs[0].id;
      }

      const fallbackUsername = (data.email || "").split("@")[0] || "user";
      setPerformer({
        id: uid,
        ...data,
        slug,
        isActive: data.enabled !== false,
        username: data.username || fallbackUsername,
      });
    } catch (error) {
      console.error(error);
      setPerformer(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPerformer();
  }, [uid]);

  const resetPassword = async () => {
    if (!performer?.email) return;
    try {
      await sendPasswordResetEmail(auth, performer.email);
      alert(`Password reset email sent to ${performer.email}`);
    } catch (error) {
      alert(error.message);
    }
  };

  const togglePerformerStatus = async () => {
    if (!performer) return;
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) {
        throw new Error("You are not authenticated.");
      }

      const currentlyActive = performer.isActive !== false;
      const response = await fetch(
        `${API_BASE}/admin-set-user-status/${performer.id}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ enabled: !currentlyActive }),
        },
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to toggle performer status.");
      }

      const payload = await response.json();
      setPerformer((prev) =>
        prev
          ? {
              ...prev,
              isActive: payload.isActive !== false,
              sessionVersion: Number(payload.sessionVersion ?? prev.sessionVersion ?? 1),
            }
          : prev,
      );
    } catch (error) {
      console.error(error);
      alert(`Error: ${error.message}`);
    }
  };

  const removePerformer = async () => {
    if (!performer) return;
    if (!confirm("Are you sure you want to delete this performer?")) return;

    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) {
        throw new Error("You are not authenticated.");
      }

      const response = await fetch(`${API_BASE}/admin-delete-user/${performer.id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to delete performer.");
      }

      nav("/admin", { replace: true });
    } catch (error) {
      console.error(error);
      alert(`Error: ${error.message}`);
    }
  };

  if (loading) {
    return (
      <div className="admin-container">
        <main className="admin-main admin-main-detail">
          <div className="admin-card performer-detail-page performer-detail-empty">
            <p>Loading performer details...</p>
          </div>
        </main>
      </div>
    );
  }

  if (!performer) {
    return (
      <div className="admin-container">
        <main className="admin-main admin-main-detail">
          <div className="admin-card performer-detail-page performer-detail-empty">
            <p>Performer not found.</p>
            <button className="back-icon-btn" onClick={() => nav("/admin")} aria-label="Back to performers">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M15.41 7.41 14 6l-6 6 6 6 1.41-1.41L10.83 12z"></path>
              </svg>
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="admin-container">
      <main className="admin-main admin-main-detail">
        <div className="admin-detail-shell">
          <div className="admin-detail-topbar">
            <div className="admin-detail-topbar-left">
              <button
                className="back-icon-btn"
                onClick={() => nav("/admin")}
                aria-label="Back to performers"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M15.41 7.41 14 6l-6 6 6 6 1.41-1.41L10.83 12z"></path>
                </svg>
              </button>
            </div>
          </div>

          <div className="admin-card performer-detail-page performer-detail-page-full">
            <div className="performer-detail-header">
              <div className="performer-identity">
                <div className="performer-avatar">
                  {(performer.username || "P").charAt(0).toUpperCase()}
                </div>
                <div className="performer-name-wrap">
                  <h4 className="performer-detail-title">{performer.username}</h4>
                </div>
              </div>
              <span className={`performer-status-chip ${performer.isActive === false ? "disabled" : "active"}`}>
                {performer.isActive === false ? "Disabled" : "Active"}
              </span>
            </div>

            <div className="performer-info performer-detail-list">
              <div className="performer-detail-row">
                <span className="performer-detail-label">Email</span>
                <span className="performer-detail-value">{performer.email}</span>
              </div>

              <div className="performer-detail-row">
                <span className="performer-detail-label">Phone</span>
                <span className="performer-detail-value">{performer.phone || "No phone"}</span>
              </div>

              <div className="performer-detail-row">
                <span className="performer-detail-label">Source</span>
                <span className="performer-detail-value">
                  {performer.createdBy === "admin" ? "Admin" : "Paid"}
                </span>
              </div>

              <div className="performer-detail-row">
                <span className="performer-detail-label">Audience Link</span>
                {performer.slug ? (
                  <a
                    href={`/${performer.slug}`}
                    target="_blank"
                    rel="noreferrer"
                    className="performer-link performer-detail-value"
                  >
                    {window.location.origin}/{performer.slug}
                  </a>
                ) : (
                  <span className="performer-link performer-detail-value">Slug missing</span>
                )}
              </div>
            </div>

            <div className="performer-actions performer-actions-sticky">
              <button
                className="btn-secondary action-btn"
                onClick={resetPassword}
                title="Send Reset Password Email"
              >
                Reset Password
              </button>
              <button
                className={`btn-secondary action-btn ${performer.isActive === false ? "action-success" : "action-warning"}`}
                onClick={togglePerformerStatus}
                title="Toggle account status"
              >
                {performer.isActive === false ? "Activate User" : "Disable User"}
              </button>
              <button
                className="btn-danger action-btn"
                onClick={removePerformer}
                title="Delete User"
              >
                Delete User
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
