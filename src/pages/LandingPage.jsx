import React from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/landing.css';

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="landing-root">
      {/* Full-bleed car background */}
      <div className="landing-bg" />

      {/* Dark overlay gradient */}
      <div className="landing-overlay" />

      {/* Content */}
      <div className="landing-content">
        {/* Logo / branding */}
        <div className="landing-brand">
          <span className="landing-icon">🛡️</span>
          <div>
            <h1 className="landing-title">SMART SEATBELT</h1>
            <p className="landing-subtitle">Occupant Monitoring &amp; Vital Surveillance</p>
          </div>
        </div>

        {/* Tagline */}
        <p className="landing-tagline">
          Real-time passenger safety intelligence.<br />
          Connected. Secured. Monitored.
        </p>

        {/* CTA Buttons */}
        <div className="landing-actions">
          <button
            className="btn-landing btn-signin"
            onClick={() => navigate('/login')}
          >
            Sign In
          </button>
          <button
            className="btn-landing btn-signup"
            onClick={() => navigate('/signup')}
          >
            Request Access
          </button>
        </div>

        <p className="landing-note">
          Access is granted only to authorised personnel.
        </p>
      </div>

      {/* Bottom gradient fade */}
      <div className="landing-bottom-fade" />
    </div>
  );
}
