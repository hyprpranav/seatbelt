import React from 'react';

/**
 * Automotive Engine Push-Start Button & Instrument Tell-Tale Indicators
 */
export default function EngineStatus({ 
  engine, 
  carEngineRelay = true, 
  sensorPowerRelay = true, 
  auxRelay = false, 
  onToggleEngine, 
  isDemoMode 
}) {
  return (
    <div className={`engine-panel ${engine ? 'engine-on' : 'engine-off'}`}>
      <div className="engine-control-container">
        
        {/* Super Round Engine Start / Stop Push Button */}
        <div className="start-button-wrapper">
          <button 
            type="button" 
            className={`super-start-btn ${engine ? 'btn-engine-active' : 'btn-engine-inactive'}`}
            onClick={onToggleEngine}
            title="Press to Start / Stop Vehicle Engine Ignition"
          >
            <div className="start-btn-outer-ring"></div>
            <div className="start-btn-inner">
              <span className="btn-top-text">ENGINE</span>
              <span className="btn-main-text">{engine ? 'STOP' : 'START'}</span>
              <span className="btn-sub-text">PUSH </span>
            </div>
            <div className="start-btn-led-ring"></div>
          </button>
          <span className="engine-status-text">
            IGNITION: <strong className={engine ? 'text-green' : 'text-red'}>{engine ? 'RUNNING' : 'STOPPED'}</strong>
          </span>
        </div>

        {/* Automotive Tell-Tale Warning & Indicator Lights */}
        <div className="telltale-lights-grid">
          <span className="telltale-header">AUTOMOTIVE INDICATOR LIGHTS</span>
          
          <div className="telltales-row">
            {/* Check Engine Light */}
            <div className={`telltale-icon-box ${engine ? 'tell-engine-on' : 'tell-off'}`} title="Check Engine Indicator">
              <span className="tell-icon">🚗</span>
              <span className="tell-label">CHECK ENGINE</span>
            </div>

            {/* Brake Warning Light */}
            <div className={`telltale-icon-box ${engine ? 'tell-brake-ok' : 'tell-off'}`} title="Brake System Status">
              <span className="tell-icon">🛑</span>
              <span className="tell-label">BRAKE SYSTEM</span>
            </div>

            {/* Tyre Pressure Light (TPMS) */}
            <div className={`telltale-icon-box ${sensorPowerRelay ? 'tell-tpms-ok' : 'tell-off'}`} title="Tyre Pressure Monitoring System (TPMS)">
              <span className="tell-icon">🛞</span>
              <span className="tell-label">TYRE (TPMS)</span>
            </div>

            {/* Battery / Sensor Power Light */}
            <div className={`telltale-icon-box ${sensorPowerRelay ? 'tell-power-on' : 'tell-off'}`} title="Sensor Power 24/7 Relay">
              <span className="tell-icon">🔋</span>
              <span className="tell-label">PWR RELAY</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
