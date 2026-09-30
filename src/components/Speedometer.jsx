import React from 'react';

/**
 * Speedometer-Style Occupant Safety Index Gauge
 */
export default function Speedometer({ safetyIndex, statusLabel = "SYSTEM OPTIMAL" }) {
  const value = Math.max(0, Math.min(100, safetyIndex || 0));

  // SVG Gauge geometry calculations: Arc from -210 deg to 30 deg (240 deg sweep)
  const radius = 110;
  const strokeWidth = 14;
  const circumference = 2 * Math.PI * radius;
  const arcLength = (240 / 360) * circumference;
  const strokeDashoffset = arcLength - (value / 100) * arcLength;

  const getColorClass = () => {
    if (value >= 80) return 'score-green';
    if (value >= 50) return 'score-amber';
    return 'score-red';
  };

  return (
    <div className="speedometer-gauge-box">
      <div className="gauge-header">
        <span className="gauge-title">OCCUPANT SAFETY INDEX</span>
      </div>

      <div className="gauge-svg-container">
        <svg viewBox="0 0 280 260" className="gauge-svg">
          <defs>
            <linearGradient id="safety-grad-green" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#00ffaa" />
              <stop offset="100%" stop-color="#00f3ff" />
            </linearGradient>
            <linearGradient id="safety-grad-amber" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#ffaa00" />
              <stop offset="100%" stop-color="#ffdd00" />
            </linearGradient>
            <linearGradient id="safety-grad-red" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#ff2a4b" />
              <stop offset="100%" stop-color="#ff5577" />
            </linearGradient>
          </defs>

          {/* Outer Decorative Bezel */}
          <circle cx="140" cy="140" r="130" fill="none" stroke="#121b2b" strokeWidth="2" />
          <circle cx="140" cy="140" r="124" fill="none" stroke="#1c283d" strokeWidth="1" strokeDasharray="4,4" />

          {/* Background Track Arc */}
          <circle
            cx="140"
            cy="140"
            r={radius}
            fill="none"
            stroke="#101726"
            strokeWidth={strokeWidth}
            strokeDasharray={`${arcLength} ${circumference}`}
            transform="rotate(150 140 140)"
            strokeLinecap="round"
          />

          {/* Value Arc */}
          <circle
            cx="140"
            cy="140"
            r={radius}
            fill="none"
            stroke={value >= 80 ? 'url(#safety-grad-green)' : (value >= 50 ? 'url(#safety-grad-amber)' : 'url(#safety-grad-red)')}
            strokeWidth={strokeWidth}
            strokeDasharray={`${arcLength} ${circumference}`}
            strokeDashoffset={strokeDashoffset}
            transform="rotate(150 140 140)"
            strokeLinecap="round"
            className="gauge-arc-animated"
          />

          {/* Tick Marks */}
          {[0, 20, 40, 60, 80, 100].map((tick) => {
            const angle = -210 + (tick / 100) * 240;
            const rad = (angle * Math.PI) / 180;
            const x1 = 140 + 92 * Math.cos(rad);
            const y1 = 140 + 92 * Math.sin(rad);
            const x2 = 140 + 82 * Math.cos(rad);
            const y2 = 140 + 82 * Math.sin(rad);
            const tx = 140 + 68 * Math.cos(rad);
            const ty = 140 + 68 * Math.sin(rad);

            return (
              <g key={tick}>
                <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#3b4d6b" strokeWidth="2" />
                <text
                  x={tx}
                  y={ty + 4}
                  fill="#60769e"
                  fontSize="11"
                  fontFamily="Rajdhani, sans-serif"
                  fontWeight="600"
                  textAnchor="middle"
                >
                  {tick}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Center Numerical Value Display */}
        <div className="gauge-center-content">
          <span className={`gauge-value ${getColorClass()}`}>{value}</span>
          <span className="gauge-unit">%</span>
          <span className={`gauge-status-tag ${getColorClass()}`}>{statusLabel}</span>
        </div>
      </div>
    </div>
  );
}
