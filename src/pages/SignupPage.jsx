import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import '../styles/auth.css';

export default function SignupPage() {
  const { signup } = useAuth();
  const navigate = useNavigate();

  const [name, setName]         = useState('');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm]   = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (password !== confirm) {
      return setError('Passwords do not match.');
    }
    if (password.length < 6) {
      return setError('Password must be at least 6 characters.');
    }

    setLoading(true);
    try {
      await signup(name.trim(), email.trim(), password);
      navigate('/pending', { replace: true });
    } catch (err) {
      console.error(err);
      if (err.code === 'auth/email-already-in-use') {
        setError('This email is already registered. Please sign in.');
      } else {
        setError('Signup failed. Please try again.');
      }
    }
    setLoading(false);
  }

  return (
    <div className="auth-root">
      <div className="auth-bg" />
      <div className="auth-overlay" />

      <div className="auth-card auth-card--wide">
        {/* Header */}
        <div className="auth-card-header">
          <span className="auth-icon">🛡️</span>
          <h2>Request Access</h2>
          <p>Submit your details — admin will review &amp; approve</p>
        </div>

        {/* Error */}
        {error && <div className="auth-error">{error}</div>}

        {/* Form */}
        <form onSubmit={handleSubmit} className="auth-form">
          <div className="auth-field">
            <label>Full Name</label>
            <input
              type="text"
              placeholder="Your full name"
              value={name}
              onChange={e => setName(e.target.value)}
              required
              autoComplete="name"
            />
          </div>

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
              placeholder="Min. 6 characters"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              autoComplete="new-password"
            />
          </div>

          <div className="auth-field">
            <label>Confirm Password</label>
            <input
              type="password"
              placeholder="Repeat your password"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              required
              autoComplete="new-password"
            />
          </div>

          <button type="submit" className="auth-btn" disabled={loading}>
            {loading ? 'Submitting...' : 'Submit Request'}
          </button>
        </form>

        <p className="auth-footer">
          Already registered?{' '}
          <Link to="/login">Sign In</Link>
        </p>
        <p className="auth-footer">
          <Link to="/">← Back to Home</Link>
        </p>
      </div>
    </div>
  );
}
