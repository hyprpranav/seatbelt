import React from 'react';
import { getSpO2Status } from '../utils/calculations';

/**
 * SpO2 Blood Oxygen Percentage Circular Gauge Module
 */
export default function SpO2Gauge({ spo2 }) {
  const val = spo2 !== null && spo2 !== undefined ? spo2 : 0;
  const status = getSpO2Status(spo2);

  const radius = 100;
  const strokeWidth = 12;
  const circumference = 2 * Math.PI * radius;
  const arcLength = (240 / 360) * circumference;
  
  // Scale 50% to 100%
  const minSpO2 = 50;
  const maxSpO2 = 100;
  const pct = Math.min(100, Math.max(0, ((val - minSpO2) / (maxSpO2 - minSpO2)) * 100));
  const strokeDashoffset = arcLength - (pct / 100) * arcLength;

  const getStatusColorClass = () => {
    if (status === 'NORMAL') return 'status-normal';
    if (status.includes('WARNING')) return 'status-warning';
    if (status.includes('CRITICAL')) return 'status-critical';
    return 'status-none';
  };

  return (
    <div className="spo2-gauge-box">
      <div className="gauge-header">
        <span className="icon">🫁</span>
        <span className="gauge-title">BLOOD OXYGEN (SpO2)</span>
      </div>

      <div className="gauge-svg-container">
        <svg viewBox="0 0 260 240" className="gauge-svg">
          <defs>
            <linearGradient id="spo2-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#00f3ff" />
              <stop offset="100%" stop-color="#0088ff" />
            </linearGradient>
          </defs>

          {/* Background Arc Track */}
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
            stroke="url(#spo2-grad)"
            strokeWidth={strokeWidth}
            strokeDasharray={`${arcLength} ${circumference}`}
            strokeDashoffset={strokeDashoffset}
            transform="rotate(150 130 130)"
            strokeLinecap="round"
            className="gauge-arc-animated"
          />

          {/* Scale Labels */}
          {[50, 65, 80, 90, 100].map((num) => {
            const angle = -210 + ((num - minSpO2) / (maxSpO2 - minSpO2)) * 240;
            const rad = (angle * Math.PI) / 180;
            const tx = 130 + 78 * Math.cos(rad);
            const ty = 130 + 78 * Math.sin(rad);

            return (
              <text
                key={num}
                x={tx}
                y={ty + 4}
                fill="#546a94"
                fontSize="10"
                fontFamily="Rajdhani, sans-serif"
                fontWeight="600"
                textAnchor="middle"
              >
                {num}
              </text>
            );
          })}
        </svg>

        <div className="gauge-center-content">
          {spo2 !== null ? (
            <>
              <span className="gauge-value val-spo2">{val}</span>
              <span className="gauge-unit">%</span>
            </>
          ) : (
            <span className="no-signal-text">NO SIGNAL</span>
          )}
          <span className={`gauge-status-badge ${getStatusColorClass()}`}>
            {status}
          </span>
        </div>
      </div>
    </div>
  );
}
