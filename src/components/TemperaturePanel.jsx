import React from 'react';
import { calculateTempDiff, getTempStatus } from '../utils/calculations';

/**
 * Dual Temperature Sensing & Difference Calculation Panel
 */
export default function TemperaturePanel({ bodyTemp, environmentTemp }) {
  const tempDiff = calculateTempDiff(bodyTemp, environmentTemp);
  const status = getTempStatus(bodyTemp);

  return (
    <div className="temperature-panel">
      <div className="panel-header">
        <span className="icon">🌡️</span>
        <span className="panel-title">THERMAL SURVEILLANCE</span>
      </div>

      <div className="temp-cards-grid">
        {/* Body Temperature Card (DS18B20) */}
        <div className="temp-card body-temp-card">
          <div className="card-top">
            <span className="sensor-tag">DS18B20 SENSOR</span>
            <span className="card-label">BODY TEMP</span>
          </div>
          <div className="card-value-box">
            {bodyTemp !== null && bodyTemp !== undefined ? (
              <>
                <span className="temp-number">{bodyTemp.toFixed(1)}</span>
                <span className="temp-unit">°C</span>
              </>
            ) : (
              <span className="no-signal">NO SIGNAL</span>
            )}
          </div>
          <div className="card-bottom">
            <span className="status-label">Temperature Status:</span>
            <span className={`status-pill ${status === 'NORMAL' ? 'pill-normal' : 'pill-alert'}`}>
              {status}
            </span>
          </div>
        </div>

        {/* Environment Temperature Card (DHT11) */}
        <div className="temp-card env-temp-card">
          <div className="card-top">
            <span className="sensor-tag">DHT11 SENSOR</span>
            <span className="card-label">ENVIRONMENT TEMP</span>
          </div>
          <div className="card-value-box">
            {environmentTemp !== null && environmentTemp !== undefined ? (
              <>
                <span className="temp-number">{environmentTemp.toFixed(1)}</span>
                <span className="temp-unit">°C</span>
              </>
            ) : (
              <span className="no-signal">NO SIGNAL</span>
            )}
          </div>
          <div className="card-bottom">
            <span className="status-label">Cabin Environment</span>
          </div>
        </div>
      </div>

      {/* Temperature Comparison Block */}
      <div className="temp-diff-box">
        <div className="diff-left">
          <span className="diff-title">BODY – ENVIRONMENT DIFFERENCE</span>
          <span className="diff-sub">Frontend Calculated Delta (ΔT)</span>
        </div>
        <div className="diff-right">
          {tempDiff !== null ? (
            <span className={`diff-value ${tempDiff >= 0 ? 'diff-pos' : 'diff-neg'}`}>
              {tempDiff >= 0 ? `+${tempDiff}` : tempDiff} °C
            </span>
          ) : (
            <span className="diff-unavailable">N/A</span>
          )}
        </div>
      </div>
    </div>
  );
}
