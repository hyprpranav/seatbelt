import React from 'react';

/**
 * Seat-Belt Safety & 30-Second Countdown Module
 */
export default function SeatbeltStatus({
  seatbelt,
  engine,
  countdown,
  buzzerState,
  onToggleSeatbelt,
  isDemoMode
}) {
  const showCountdown = engine && !seatbelt;

  const getBuzzerBadgeClass = () => {
    switch (buzzerState) {
      case 'SLOW': return 'buzzer-slow';
      case 'FAST': return 'buzzer-fast';
      case 'CONTINUOUS': return 'buzzer-continuous';
      default: return 'buzzer-off';
    }
  };

  const getBlinkClass = () => {
    if (!showCountdown) return '';
    if (countdown <= 10 && countdown > 5) return 'blink-slow';
    if (countdown <= 5 && countdown > 0) return 'blink-fast';
    if (countdown === 0) return 'engine-stopped-pulse';
    return '';
  };

  return (
    <div className={`seatbelt-panel ${seatbelt ? 'seatbelt-fastened' : (engine ? 'seatbelt-unfastened-alert' : 'seatbelt-unfastened')} ${getBlinkClass()}`}>
      <div className="seatbelt-header">
        <div className="seatbelt-icon-box">
          <svg viewBox="0 0 24 24" className="seatbelt-icon" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM10 17L5 12L6.41 10.59L10 14.17L17.59 6.58L19 8L10 17Z" />
          </svg>
        </div>
        <div className="seatbelt-title-group">
          <span className="label">OCCUPANT SEAT-BELT</span>
          <span className={`seatbelt-text ${seatbelt ? 'text-green' : 'text-red'}`}>
            {seatbelt ? 'FASTENED' : 'NOT FASTENED'}
          </span>
        </div>
        <button 
          type="button" 
          className="demo-toggle-btn"
          onClick={onToggleSeatbelt}
          title="Click to toggle seat-belt state"
        >
          {seatbelt ? 'UNFASTEN' : 'FASTEN BELT'}
        </button>
      </div>

      {showCountdown && (
        <div className={`countdown-container ${getBlinkClass()}`}>
          <div className="countdown-ring">
            <span className="countdown-number">{countdown}</span>
            <span className="countdown-unit">SEC</span>
          </div>
          <div className="countdown-warning-box">
            <span className="warning-title">⚠️ SEAT BELT WARNING</span>
            <span className="warning-subtitle">
              {countdown > 10 && "Fasten Seat-Belt Prompt Active - Vehicle active"}
              {countdown <= 10 && countdown > 5 && "🟡 SLOW WARNING BLINK ACTIVE (10s-5s remaining)"}
              {countdown <= 5 && countdown > 0 && "🚨 EMERGENCY FAST BLINK ACTIVE! Shutting down in seconds!"}
              {countdown === 0 && "🛑 CAR ENGINE STOPPED - Please wear seatbelt to restart"}
            </span>
          </div>
        </div>
      )}

      {!engine && !seatbelt && countdown === 0 && (
        <div className="engine-cutoff-banner">
          <span className="cutoff-icon">🛑</span>
          <div className="cutoff-text-group">
            <span className="cutoff-title">CAR ENGINE STOPPED</span>
            <span className="cutoff-sub">Seat belt was not fastened in 30s. Fasten seat belt to restart vehicle.</span>
          </div>
        </div>
      )}

      <div className="buzzer-status-row">
        <span className="buzzer-label">ALERT BUZZER:</span>
        <span className={`buzzer-badge ${getBuzzerBadgeClass()}`}>
          {buzzerState === 'OFF' ? 'OFF' : `${buzzerState} BEEP`}
        </span>
      </div>
    </div>
  );
}
