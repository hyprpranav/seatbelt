import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth, ADMIN_EMAIL } from '../contexts/AuthContext';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import '../styles/auth.css';

export default function LoginPage() {
  const { login, fetchProfile } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const cred = await login(email, password);
      const profile = await fetchProfile(cred.user.uid);

      if (!profile) {
        setError('Account not found. Please sign up first.');
        setLoading(false);
        return;
      }

      const isAdmin = email.toLowerCase() === ADMIN_EMAIL.toLowerCase();

      if (isAdmin) {
        navigate('/admin', { replace: true });
      } else if (profile.status === 'approved') {
        navigate('/dashboard', { replace: true });
      } else {
        navigate('/pending', { replace: true });
      }
    } catch (err) {
      console.error(err);
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setError('Invalid email or password. Please try again.');
      } else {
        setError('Login failed. Please try again.');
      }
    }

    setLoading(false);
  }

  return (
    <div className="auth-root">
      <div className="auth-bg" />
      <div className="auth-overlay" />

      <div className="auth-card">
        {/* Header */}
        <div className="auth-card-header">
          <span className="auth-icon">🛡️</span>
          <h2>Sign In</h2>
          <p>Smart Seatbelt Monitor</p>
        </div>

        {/* Error */}
        {error && <div className="auth-error">{error}</div>}

        {/* Form */}
        <form onSubmit={handleSubmit} className="auth-form">
          <div className="auth-field">
            <label>Email Address</label>
            <input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>

          <div className="auth-field">
            <label>Password</label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>

          <button type="submit" className="auth-btn" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p className="auth-footer">
          Don't have access?{' '}
          <Link to="/signup">Request Access</Link>
        </p>
        <p className="auth-footer">
          <Link to="/">← Back to Home</Link>
        </p>
      </div>
    </div>
  );
}
