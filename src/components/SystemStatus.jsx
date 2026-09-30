import React, { useRef, useEffect } from 'react';

/**
 * System Status, PPG Wave Plotter, Event Log & Export Control Module
 */
export default function SystemStatus({
  connectionStatus,
  isDemoMode,
  onToggleDemoMode,
  vitalHistory = [],
  eventLog = [],
  onExportCSV
}) {
  const canvasRef = useRef(null);

  // Render live PPG/ECG styled pulse wave line on Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);

    // Draw background grid lines
    ctx.strokeStyle = 'rgba(0, 243, 255, 0.07)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 0; x < width; x += 20) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
    }
    for (let y = 0; y < height; y += 15) {
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
    }
    ctx.stroke();

    if (vitalHistory.length < 2) return;

    // Draw Vital Trend Line (Heart Rate)
    ctx.beginPath();
    ctx.strokeStyle = '#00f3ff';
    ctx.lineWidth = 2.5;
    ctx.shadowColor = '#00f3ff';
    ctx.shadowBlur = 8;

    const minHR = 40;
    const maxHR = 140;
    const stepX = width / Math.max(30, vitalHistory.length - 1);

    vitalHistory.forEach((pt, i) => {
      const hrVal = pt.heartRate !== null && pt.heartRate !== undefined ? pt.heartRate : 70;
      const normY = (hrVal - minHR) / (maxHR - minHR);
      const y = height - (normY * (height - 20) + 10);
      const x = i * stepX;

      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });

    ctx.stroke();
    ctx.shadowBlur = 0; // Reset shadow
  }, [vitalHistory]);

  const isStreamActive = isDemoMode || connectionStatus === 'CONNECTED';

  return (
    <div className="system-status-container">
      <div className="status-top-bar">
        <div className="stream-badge-box">
          <span className={`live-dot ${isStreamActive ? 'dot-active' : 'dot-inactive'}`}></span>
          <span className="stream-text">
            {isStreamActive ? 'LIVE ● DATA STREAM ACTIVE' : 'DATA STREAM LOST'}
          </span>
        </div>

        <div className="action-buttons-group">
          <button
            type="button"
            className={`btn-demo-mode ${isDemoMode ? 'active' : ''}`}
            onClick={onToggleDemoMode}
          >
            {isDemoMode ? '⚡ DEMO MODE: ON' : '⚙️ DEMO MODE: OFF'}
          </button>

          <button type="button" className="btn-export-csv" onClick={onExportCSV}>
            📥 EXPORT SESSION CSV
          </button>
        </div>
      </div>

      {/* Live PPG / Heart Rate Trend Wave Plot */}
      <div className="ppg-wave-box">
        <div className="wave-header">
          <span className="wave-title">LIVE VITAL PPG / HR TREND WAVE</span>
          <span className="wave-scale">Scale: 40 - 140 BPM (Last {vitalHistory.length} samples)</span>
        </div>
        <canvas
          ref={canvasRef}
          width={600}
          height={90}
          className="ppg-canvas"
        />
      </div>

      {/* Real-Time Event Log */}
      <div className="event-log-box">
        <div className="log-header">
          <span className="icon">📋</span>
          <span className="log-title">REAL-TIME SYSTEM EVENT LOG</span>
        </div>
        <div className="log-scroll-area">
          {eventLog.length === 0 ? (
            <div className="log-empty">System initialized. Awaiting sensor updates...</div>
          ) : (
            eventLog.slice(0, 15).map((log, i) => (
              <div key={i} className={`log-entry entry-${log.type}`}>
                <span className="log-time">{log.time}</span>
                <span className="log-msg">{log.message}</span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Project Metadata Bar */}
      <div className="project-info-bar">
        <span>SYSTEM: <strong>SMART SEAT-BELT MONITOR</strong></span>
        <span>CONTROLLER: <strong>ESP32</strong></span>
        <span>SENSORS: <strong>DS18B20 | DHT11 | MAX3010x | ANALOG PULSE</strong></span>
        <span>COMM: <strong>Wi-Fi HTTP API</strong></span>
      </div>
    </div>
  );
}
