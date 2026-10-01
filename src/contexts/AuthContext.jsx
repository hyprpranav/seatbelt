import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth';
import {
  doc,
  setDoc,
  getDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { auth, db } from '../firebase/config';

export const ADMIN_EMAIL = 'harishspranav2006@gmail.com';

const AuthContext = createContext(null);

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // Sign Up
  async function signup(name, email, password) {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    // Auto-approve the hardcoded admin email
    const role = email.toLowerCase() === ADMIN_EMAIL.toLowerCase() ? 'admin' : 'user';
    const status = role === 'admin' ? 'approved' : 'pending';
    
    await setDoc(doc(db, 'users', user.uid), {
      name,
      email,
      role,
      status,
      createdAt: serverTimestamp(),
      requestedAt: serverTimestamp(),
    });

    await fetchProfile(user.uid);
    return userCredential;
  }

  // Login
  async function login(email, password) {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    await fetchProfile(userCredential.user.uid);
    return userCredential;
  }

  // Logout
  function logout() {
    setUserProfile(null);
    return signOut(auth);
  }

  // Fetch Firestore profile
  async function fetchProfile(uid) {
    if (!uid) {
      setUserProfile(null);
      return;
    }
    const docRef = doc(db, 'users', uid);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      setUserProfile({ id: docSnap.id, ...docSnap.data() });
    } else {
      setUserProfile(null);
    }
  }

  // Listen to Auth State
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        await fetchProfile(user.uid);
      } else {
        setUserProfile(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const isAdmin = userProfile?.role === 'admin';

  const value = {
    currentUser,
    userProfile,
    isAdmin,
    signup,
    login,
    logout,
    fetchProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
