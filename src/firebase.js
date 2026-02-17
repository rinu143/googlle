import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCERFbeqGpsN_jwN68nE1PxpFu4me8mir4",
  authDomain: "mentalism-portal.firebaseapp.com",
  databaseURL:
    "https://mentalism-portal-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "mentalism-portal",
  storageBucket: "mentalism-portal.firebasestorage.app",
  messagingSenderId: "255169478966",
  appId: "1:255169478966:web:ab41100f0ca1f3b54f7397",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
