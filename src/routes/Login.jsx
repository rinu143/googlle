import { useState, useEffect } from "react";
import { signInWithEmailAndPassword, signOut } from "firebase/auth";
import { auth, db } from "../firebase";
import { useNavigate } from "react-router-dom";
import {
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  collection,
} from "firebase/firestore";
import { getDeviceId } from "../services/deviceService";
import "./Login.css";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const nav = useNavigate();

  useEffect(() => {
    const savedEmail = localStorage.getItem("savedEmail");
    const savedPassword = localStorage.getItem("savedPassword");
    if (savedEmail) setEmail(savedEmail);
    if (savedPassword) setPassword(savedPassword);
  }, []);

  const login = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      // Save credentials for auto-fill until logout
      localStorage.setItem("savedEmail", email);
      localStorage.setItem("savedPassword", password);

      const uid = cred.user.uid;

      // read role first
      const userSnap = await getDoc(doc(db, "users", uid));
      const userData = userSnap.data() || {};
      const role = userData.role;
      const isActive = userData.enabled !== false;
      const sessionVersion = Number(userData.sessionVersion ?? 1);

      if (!isActive) {
        await signOut(auth);
        setError("This account is disabled.");
        setLoading(false);
        return;
      }

      localStorage.setItem("sessionVersion", String(sessionVersion));

      // ADMIN → skip device limit
      if (role === "admin") {
        nav("/admin");
        return;
      }

      // PERFORMER: max 2 devices. If a 3rd device logs in, kick the most recently logged-in previous device.
      const deviceId = getDeviceId();
      const devicesRef = collection(db, "sessions", uid, "devices");
      const devicesSnap = await getDocs(devicesRef);
      const now = Date.now();

      const devices = devicesSnap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }));

      const currentDeviceExists = devices.some((d) => d.id === deviceId);

      if (!currentDeviceExists && devices.length >= 2) {
        const mostRecentDevice = devices.reduce((latest, current) => {
          const latestCreatedAt = Number(latest.createdAt ?? 0);
          const currentCreatedAt = Number(current.createdAt ?? 0);
          return currentCreatedAt > latestCreatedAt ? current : latest;
        });

        await deleteDoc(doc(db, "sessions", uid, "devices", mostRecentDevice.id));
      }

      const currentDevice = devices.find((d) => d.id === deviceId);
      await setDoc(doc(db, "sessions", uid, "devices", deviceId), {
        createdAt: Number(currentDevice?.createdAt ?? now),
        lastSeen: now,
      });

      nav("/dashboard");
    } catch (err) {
      console.error(err);
      setError("Failed to login. Please check your credentials.");
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <h2 className="login-title">Login</h2>

        {error && <div className="login-error">{error}</div>}

        <form onSubmit={login} className="login-form">
          <div className="login-input-group">
            <label className="login-label">Email</label>
            <input
              className="login-input"
              type="email"
              placeholder="admin@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="login-input-group">
            <label className="login-label">Password</label>
            <input
              className="login-input"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="login-button" disabled={loading}>
            {loading ? <span className="spinner"></span> : "Sign In"}
          </button>

          <button
            type="button"
            className="secondary-button"
            onClick={() => nav("/signup")}
            disabled={loading}
          >
            Create Account
          </button>
        </form>
      </div>
    </div>
  );
}
