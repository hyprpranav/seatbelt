import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import '../styles/auth.css';

export default function PendingPage() {
  const { logout, userProfile } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate('/', { replace: true });
  }

  return (
    <div className="auth-root">
      <div className="auth-bg" />
      <div className="auth-overlay" />

      <div className="auth-card pending-card">
        <div className="pending-icon">⏳</div>
        <h2 className="pending-title">Request Submitted</h2>
        <p className="pending-name">
          Hello, <strong>{userProfile?.name || 'User'}</strong>
        </p>
        <p className="pending-msg">
          Your access request has been submitted successfully and is currently
          <strong> pending admin approval.</strong>
        </p>
        <div className="pending-info">
          <span>📧</span>
          <span>
            To get approved sooner, contact the system administrator at{' '}
            <a href="mailto:harishspranav2006@gmail.com">
              harishspranav2006@gmail.com
            </a>
          </span>
        </div>
        <p className="pending-refresh">
          Once your account is approved, sign in again to access the dashboard.
        </p>
        <button className="auth-btn pending-logout-btn" onClick={handleLogout}>
          Sign Out
        </button>
      </div>
    </div>
  );
}
