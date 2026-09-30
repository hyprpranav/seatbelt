import React from 'react';

/**
 * Emergency Alert Banner & History Log
 */
export default function EmergencyPanel({
  emergencyState,
  sensorData,
  onAcknowledge,
  emergencyHistory = []
}) {
  if (!emergencyState.isEmergency) {
    if (emergencyHistory.length === 0) return null;

    // Show compact history drawer if there's prior history
    return (
      <div className="emergency-history-summary">
        <span className="history-title">📜 EMERGENCY LOG SNAPSHOTS ({emergencyHistory.length})</span>
        <div className="history-list">
          {emergencyHistory.slice(0, 3).map((item, idx) => (
            <div key={idx} className="history-item">
              <span className="time">{new Date(item.timestamp).toLocaleTimeString()}</span>
              <span className="reason">{item.reason}</span>
              <span className="vitals">
                HR: {item.heartRate || '--'} | SpO2: {item.spo2 || '--'}% | Temp: {item.bodyTemp || '--'}°C
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="emergency-overlay-panel">
      <div className="emergency-content">
        <div className="emergency-banner-header">
          <span className="alert-icon">⚠️</span>
          <div className="alert-title-group">
            <h2>POTENTIAL EMERGENCY DETECTED</h2>
            <p className="alert-sub">Multi-Condition Vital surveillance Alert Active</p>
          </div>
          <button type="button" className="btn btn-acknowledge" onClick={onAcknowledge}>
            ACKNOWLEDGE / CLEAR
          </button>
        </div>

        <div className="emergency-reason-box">
          <span className="reason-label">REASON FOR ALERT:</span>
          <span className="reason-text">{emergencyState.reason || "Abnormal physiological signals detected"}</span>
        </div>

        <div className="emergency-snapshot-grid">
          <div className="snap-card">
            <span className="snap-label">HEART RATE</span>
            <span className="snap-val val-red">{sensorData.heartRate ? `${sensorData.heartRate} BPM` : 'NO SIGNAL'}</span>
          </div>

          <div className="snap-card">
            <span className="snap-label">BLOOD OXYGEN</span>
            <span className="snap-val val-red">{sensorData.spo2 ? `${sensorData.spo2}%` : 'NO SIGNAL'}</span>
          </div>

          <div className="snap-card">
            <span className="snap-label">BODY TEMP</span>
            <span className="snap-val">{sensorData.bodyTemp ? `${sensorData.bodyTemp}°C` : 'NO SIGNAL'}</span>
          </div>

          <div className="snap-card">
            <span className="snap-label">SEAT-BELT</span>
            <span className={`snap-val ${sensorData.seatbelt ? 'val-green' : 'val-red'}`}>
              {sensorData.seatbelt ? 'FASTENED' : 'NOT FASTENED'}
            </span>
          </div>

          <div className="snap-card">
            <span className="snap-label">ENGINE</span>
            <span className={`snap-val ${sensorData.engine ? 'val-green' : 'val-red'}`}>
              {sensorData.engine ? 'ON' : 'OFF'}
            </span>
          </div>

          <div className="snap-card">
            <span className="snap-label">EVENT TIMESTAMP</span>
            <span className="snap-val snap-time">
              {new Date(sensorData.timestamp || Date.now()).toLocaleTimeString()}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
