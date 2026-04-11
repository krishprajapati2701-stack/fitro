import React, { createContext, useContext, useState, useEffect } from "react";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  updatePassword,
  onAuthStateChanged,
} from "firebase/auth";
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../firebase";

const AuthContext = createContext();
export const useAuth = () => useContext(AuthContext);

export const ADMIN_EMAIL = "fitrostore1@gmail.com";

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  async function register({ email, password, name, phone }) {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    await setDoc(doc(db, "users", result.user.uid), {
      uid: result.user.uid,
      name,
      email,
      phone,
      role: "user",
      createdAt: serverTimestamp(),
      addresses: [],
    });
    return result;
  }

  async function login(email, password) {
    return signInWithEmailAndPassword(auth, email, password);
  }

  async function logout() {
    await signOut(auth);
    setUserProfile(null);
  }

  function resetPassword(email) {
    return sendPasswordResetEmail(auth, email);
  }

  function changePassword(newPassword) {
    return updatePassword(currentUser, newPassword);
  }

  async function fetchUserProfile(user) {
    if (!user) return null;
    try {
      const snap = await getDoc(doc(db, "users", user.uid));
      if (snap.exists()) return snap.data();
      if (user.email === ADMIN_EMAIL) {
        const adminData = { uid: user.uid, email: user.email, role: "admin", name: "Admin" };
        await setDoc(doc(db, "users", user.uid), { ...adminData, createdAt: serverTimestamp() });
        return adminData;
      }
      return null;
    } catch (e) {
      if (user.email === ADMIN_EMAIL) return { uid: user.uid, email: user.email, role: "admin", name: "Admin" };
      return null;
    }
  }

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        const profile = await fetchUserProfile(user);
        setUserProfile(profile);
      } else {
        setUserProfile(null);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  const isAdmin = userProfile?.role === "admin" || currentUser?.email === ADMIN_EMAIL;

  const value = { currentUser, userProfile, isAdmin, loading, register, login, logout, resetPassword, changePassword };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
