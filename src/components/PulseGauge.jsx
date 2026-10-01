import React from 'react';
import { getHeartRateStatus } from '../utils/calculations';

/**
 * Heart-Rate & Secondary Pulse Sensor Circular Gauge Module
 */
export default function PulseGauge({ heartRate, pulseDetected, pulseValue }) {
  const hr = heartRate !== null && heartRate !== undefined ? heartRate : 0;
  const status = getHeartRateStatus(heartRate);

  // SVG Gauge calculations
  const radius = 100;
  const strokeWidth = 12;
  const circumference = 2 * Math.PI * radius;
  // Sweep from -210 deg to 30 deg (240 deg)
  const arcLength = (240 / 360) * circumference;
  
  // BPM scale: 0 to 180 BPM
  const maxBPM = 180;
  const pct = Math.min(100, Math.max(0, (hr / maxBPM) * 100));
  const strokeDashoffset = arcLength - (pct / 100) * arcLength;

  const getStatusColorClass = () => {
    if (status === 'NORMAL') return 'status-normal';
    if (status.includes('ELEVATED') || status.includes('LOW')) return 'status-warning';
    if (status.includes('CRITICAL')) return 'status-critical';
    return 'status-none';
  };

  return (
    <div className="pulse-gauge-box">
      <div className="gauge-header">
        <span className="icon">❤️</span>
        <span className="gauge-title">PRIMARY HEART RATE</span>
      </div>

      <div className="gauge-svg-container">
        <svg viewBox="0 0 260 240" className="gauge-svg">
          <defs>
            <linearGradient id="hr-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#ff2a4b" />
              <stop offset="100%" stop-color="#ff758c" />
            </linearGradient>
          </defs>

          {/* Outer Ring */}
          <circle cx="130" cy="130" r="118" fill="none" stroke="#121a28" strokeWidth="2" />
          
          {/* Background Track */}
          <circle
            cx="130"
            cy="130"
            r={radius}
            fill="none"
            stroke="#0e1724"
            strokeWidth={strokeWidth}
            strokeDasharray={`${arcLength} ${circumference}`}
            transform="rotate(150 130 130)"
            strokeLinecap="round"
          />

          {/* Active Arc */}
          <circle
            cx="130"
            cy="130"
            r={radius}
            fill="none"
            stroke="url(#hr-grad)"
            strokeWidth={strokeWidth}
            strokeDasharray={`${arcLength} ${circumference}`}
            strokeDashoffset={strokeDashoffset}
            transform="rotate(150 130 130)"
            strokeLinecap="round"
            className="gauge-arc-animated"
          />

          {/* BPM Scale Labels */}
          {[0, 40, 80, 120, 160].map((bpm) => {
            const angle = -210 + (bpm / maxBPM) * 240;
            const rad = (angle * Math.PI) / 180;
            const tx = 130 + 78 * Math.cos(rad);
            const ty = 130 + 78 * Math.sin(rad);

            return (
              <text
                key={bpm}
                x={tx}
                y={ty + 4}
                fill="#546a94"
                fontSize="10"
                fontFamily="Rajdhani, sans-serif"
                fontWeight="600"
                textAnchor="middle"
              >
                {bpm}
              </text>
            );
          })}
        </svg>

        <div className="gauge-center-content">
          {heartRate !== null ? (
            <>
              <span className="gauge-value val-hr">{hr}</span>
              <span className="gauge-unit">BPM</span>
            </>
          ) : (
            <span className="no-signal-text">NO SIGNAL</span>
          )}
          <span className={`gauge-status-badge ${getStatusColorClass()}`}>
            {status}
          </span>
        </div>
      </div>

      {/* Secondary Pulse Signal Info Block */}
      <div className="pulse-signal-card">
        <div className="signal-row">
          <span className="sig-label">PULSE SIGNAL:</span>
          <span className={`sig-val ${pulseDetected ? 'sig-good' : 'sig-bad'}`}>
            {pulseDetected ? '● GOOD' : '○ NO SIGNAL'}
          </span>
        </div>
        <div className="signal-row">
          <span className="sig-label">RAW PULSE VALUE:</span>
          <span className="sig-val" style={{ fontSize: '24px', fontWeight: 'bold', color: pulseDetected ? '#00f3ff' : '#546a94' }}>
            {pulseValue || 0}
          </span>
        </div>
      </div>
    </div>
  );
}
