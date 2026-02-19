import { createContext, useContext, useEffect, useState } from "react";
import { auth } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";
import { onSnapshot, doc } from "firebase/firestore";
import { db } from "../firebase";
import { getDeviceId } from "../services/deviceService";
import { signOut } from "firebase/auth";
import { getDoc } from "firebase/firestore";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribeSession = null;
    let sessionInterval = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        setUser(null);
        setLoading(false);
        localStorage.removeItem("sessionVersion");
        if (unsubscribeSession) unsubscribeSession();
        if (sessionInterval) {
          clearInterval(sessionInterval);
          sessionInterval = null;
        }
        return;
      }

      setUser(firebaseUser);

      try {
        // read role
        const userRef = doc(db, "users", firebaseUser.uid);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
          const role = userSnap.data().role;

          if (sessionInterval) {
            clearInterval(sessionInterval);
          }
          sessionInterval = setInterval(async () => {
            try {
              const latestSnap = await getDoc(userRef);
              if (!latestSnap.exists()) return;

              const remoteVersion = Number(latestSnap.data()?.sessionVersion ?? 1);
              const localVersion = Number(
                localStorage.getItem("sessionVersion") ?? 1,
              );

              if (remoteVersion !== localVersion) {
                await signOut(auth);
              }
            } catch (e) {
              console.error("Session version check failed", e);
            }
          }, 10000);

          // ONLY performers should have device enforcement
          if (role === "performer") {
            const deviceId = getDeviceId();
            const sessionRef = doc(
              db,
              "sessions",
              firebaseUser.uid,
              "devices",
              deviceId,
            );

            // Unsubscribe previous listener if exists
            if (unsubscribeSession) unsubscribeSession();

            let seenExistingSession = false;
            unsubscribeSession = onSnapshot(sessionRef, (snap) => {
              // First login can briefly have no session doc until Login.jsx writes it.
              // Only force logout if we had a session before and it was removed later.
              if (snap.exists()) {
                seenExistingSession = true;
                return;
              }

              if (seenExistingSession) {
                signOut(auth);
              }
            });
          }
        }
      } catch (error) {
        console.error("Error fetching user role:", error);
      }

      setLoading(false);
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeSession) unsubscribeSession();
      if (sessionInterval) clearInterval(sessionInterval);
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
