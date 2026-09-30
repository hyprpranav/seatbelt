import React, { createContext, useContext, useEffect, useState } from 'react';

// =====================================================================
// ⚠️ TEMPORARY LOCAL STORAGE AUTHENTICATION (DEMO MODE) ⚠️
// TODO: WHEN READY FOR FIREBASE, THIS FILE WILL BE REPLACED WITH 
// THE REAL FIREBASE AUTH CONTEXT. 
// =====================================================================

export const ADMIN_EMAIL = 'harishspranav2006@gmail.com';
const ADMIN_PASS = '927624BEC066'; // For demo validation

const AuthContext = createContext(null);

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // Helper to read/write local storage
  const getLocalUsers = () => JSON.parse(localStorage.getItem('demo_users') || '[]');
  const saveLocalUsers = (users) => localStorage.setItem('demo_users', JSON.stringify(users));

  // ── Auto-login from session ──────────────────────────────
  useEffect(() => {
    const sessionEmail = localStorage.getItem('demo_session');
    if (sessionEmail) {
      const users = getLocalUsers();
      const user = users.find(u => u.email === sessionEmail);
      if (user) {
        setCurrentUser({ uid: user.email, email: user.email });
        setUserProfile(user);
      } else {
        localStorage.removeItem('demo_session');
      }
    }
    setLoading(false);
  }, []);

  // ── Sign Up ──────────────────────────────────────────────
  async function signup(name, email, password) {
    const users = getLocalUsers();
    const emailLower = email.toLowerCase();
    
    if (users.find(u => u.email === emailLower)) {
      const err = new Error();
      err.code = 'auth/email-already-in-use';
      throw err;
    }

    const isAdmin = emailLower === ADMIN_EMAIL.toLowerCase();

    const newUser = {
      id: emailLower, // using email as id for local demo
      name,
      email: emailLower,
      password, // Storing plaintext ONLY for this local demo!
      role: isAdmin ? 'admin' : 'user',
      status: isAdmin ? 'approved' : 'pending',
      requestedAt: new Date().toISOString(),
      approvedAt: isAdmin ? new Date().toISOString() : null,
    };

    users.push(newUser);
    saveLocalUsers(users);

    // Auto sign-in if admin
    if (isAdmin) {
      localStorage.setItem('demo_session', emailLower);
      setCurrentUser({ uid: emailLower, email: emailLower });
      setUserProfile(newUser);
    }
    
    return { user: { uid: emailLower } };
  }

  // ── Sign In ──────────────────────────────────────────────
  async function login(email, password) {
    const emailLower = email.toLowerCase();
    
    // Auto-create admin if they haven't signed up yet but try to login with correct credentials
    if (emailLower === ADMIN_EMAIL.toLowerCase() && password === ADMIN_PASS) {
      let users = getLocalUsers();
      let adminUser = users.find(u => u.email === emailLower);
      
      if (!adminUser) {
        adminUser = {
          id: emailLower,
          name: 'Administrator',
          email: emailLower,
          password: ADMIN_PASS,
          role: 'admin',
          status: 'approved',
          requestedAt: new Date().toISOString(),
          approvedAt: new Date().toISOString(),
        };
        users.push(adminUser);
        saveLocalUsers(users);
      }
    }

    const users = getLocalUsers();
    const user = users.find(u => u.email === emailLower && u.password === password);

    if (!user) {
      const err = new Error();
      err.code = 'auth/wrong-password';
      throw err;
    }

    localStorage.setItem('demo_session', emailLower);
    setCurrentUser({ uid: emailLower, email: emailLower });
    setUserProfile(user);
    
    return { user: { uid: emailLower } };
  }

  // ── Sign Out ─────────────────────────────────────────────
  async function logout() {
    localStorage.removeItem('demo_session');
    setCurrentUser(null);
    setUserProfile(null);
  }

  // ── Fetch Profile ─────────────────────────────────────────
  async function fetchProfile(uid) {
    const users = getLocalUsers();
    return users.find(u => u.id === uid) || null;
  }

  const isAdmin = currentUser?.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();

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
