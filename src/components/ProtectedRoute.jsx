import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

// Blocks unauthenticated users — sends to /login
export function ProtectedRoute({ children }) {
  const { currentUser, userProfile } = useAuth();

  if (!currentUser) return <Navigate to="/login" replace />;

  // If profile not yet loaded, wait
  if (!userProfile) return null;

  // If user hasn't been approved yet
  if (userProfile.status === 'pending') {
    return <Navigate to="/pending" replace />;
  }

  return children;
}

// Blocks non-admins — sends to /dashboard
export function AdminRoute({ children }) {
  const { currentUser, isAdmin, userProfile } = useAuth();

  if (!currentUser) return <Navigate to="/login" replace />;
  if (!userProfile) return null;
  if (!isAdmin) return <Navigate to="/dashboard" replace />;

  return children;
}
