import React, { useState, useEffect, useRef, useCallback } from 'react';
import ConnectionPanel from '../components/ConnectionPanel';
import EngineStatus from '../components/EngineStatus';
import SeatbeltStatus from '../components/SeatbeltStatus';
import Speedometer from '../components/Speedometer';
import PulseGauge from '../components/PulseGauge';
import SpO2Gauge from '../components/SpO2Gauge';
import TemperaturePanel from '../components/TemperaturePanel';
import EmergencyPanel from '../components/EmergencyPanel';
import WarningPanel from '../components/WarningPanel';
import SensorCards from '../components/SensorCards';
import SystemStatus from '../components/SystemStatus';

import {
  calculateSafetyIndex,
  evaluateEmergencyCondition,
  getBuzzerState,
  getHeartRateStatus,
  getSpO2Status,
  getTempStatus,
  checkPulseDecreasing
} from '../utils/calculations';

import {
  sanitizeSensorData,
  generateDemoSensorData,
  controlESP32Engine,
  controlESP32Seatbelt
} from '../utils/api';

import {
  requestSerialPort,
  openSerialPort,
  startSerialStream,
  getPortLabel
} from '../utils/serial';

import '../styles/global.css';
import '../styles/dashboard.css';
import '../styles/responsive.css';

import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function UserDashboard() {
  const { userProfile, logout } = useAuth();
  const navigate = useNavigate();

  // Serial Port Connection State
  const [connectionStatus, setConnectionStatus] = useState("DISCONNECTED"); // DISCONNECTED | CONNECTING | CONNECTED | ERROR
  const [portLabel, setPortLabel] = useState("");        // Display label for the connected COM port
  const [lastError, setLastError] = useState("");
  const [isDemoMode, setIsDemoMode] = useState(false);

  // Serial port & stream refs (not React state — managed imperatively)
  const serialPortRef = useRef(null);   // The SerialPort object
  const serialStopRef = useRef(null);   // The stop() function from startSerialStream

  // Sensor Data State
  const [sensorData, setSensorData] = useState({
    engine: false,
    relay: false,
    carEngineRelay: false,
    sensorPowerRelay: true,
    auxRelay: false,
    seatbelt: true,
    heartRate: 76,
    spo2: 98,
    bodyTemp: 36.6,
    environmentTemp: 28.5,
    pulseDetected: true,
    buzzer: "OFF",
    emergency: false,
    timestamp: Date.now()
  });

  // Seat-Belt Countdown & Buzzer State
  const [countdown, setCountdown] = useState(30);

  // Emergency & Logging State
  const [emergencyState, setEmergencyState] = useState({ isEmergency: false, reason: "" });
  const [emergencyHistory, setEmergencyHistory] = useState([]);
  const [vitalHistory, setVitalHistory] = useState([]);
  const [eventLog, setEventLog] = useState([]);
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString());

  // Polling ref to track timer & error tolerance
  const pollTimerRef = useRef(null);
  const countdownTimerRef = useRef(null);
  const consecutiveErrorsRef = useRef(0);

  // Helper to append timestamped event to log
  const addLog = useCallback((message, type = "info") => {
    const timeStr = new Date().toLocaleTimeString();
    setEventLog((prev) => [{ time: timeStr, message, type }, ...prev.slice(0, 25)]);
  }, []);

  // Update Clock
  useEffect(() => {
    const clockTimer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString());
    }, 1000);
    return () => clearInterval(clockTimer);
  }, []);

  // ── SERIAL PORT CONNECTION ──────────────────────────────────────────────────
  // Opens the browser's native COM port picker, opens the port at 115200 baud,
  // then starts streaming newline-delimited JSON from the ESP32.
  const handleConnect = useCallback(async () => {
    setConnectionStatus("CONNECTING");
    setLastError("");
    addLog("Opening port picker — select your ESP32 COM port...", "info");

    try {
      // 1. Browser shows native COM port picker to user
      const port = await requestSerialPort();
      serialPortRef.current = port;
      setPortLabel(getPortLabel(port));

      // 2. Open at 115200 baud (must match ESP32 Serial.begin(115200))
      await openSerialPort(port);
      setConnectionStatus("CONNECTED");
      addLog(`Serial port connected: ${getPortLabel(port)} @ 115200 baud`, "info");

      // 3. Start streaming JSON lines → update dashboard in real-time
      const { stop } = startSerialStream(
        port,
        (data) => {
          // Called for every valid JSON frame received from ESP32
          try {
            const sanitized = sanitizeSensorData(data);
            setSensorData(sanitized);
            setLastError("");
            setVitalHistory((prev) => [
              ...prev.slice(-60),
              { time: new Date().toLocaleTimeString(), heartRate: sanitized.heartRate, spo2: sanitized.spo2 }
            ]);
          } catch (parseErr) {
            // Ignore malformed frames silently
          }
        },
        (errMsg) => {
          // Called on stream error / port disconnect
          setLastError(errMsg);
          addLog(`Serial Stream Error: ${errMsg}`, "warning");
          setConnectionStatus("ERROR");
        }
      );

      serialStopRef.current = stop;
    } catch (err) {
      // User cancelled picker or port failed to open
      if (err.name !== 'NotSelectedError' && !err.message?.includes('No port selected')) {
        setLastError(err.message);
        addLog(`Serial Port Error: ${err.message}`, "alert");
      } else {
        addLog("Port selection cancelled.", "info");
      }
      setConnectionStatus("DISCONNECTED");
    }
  }, [addLog]);

  const handleDisconnect = useCallback(async () => {
    if (serialStopRef.current) {
      await serialStopRef.current();
      serialStopRef.current = null;
    }
    serialPortRef.current = null;
    setPortLabel("");
    setConnectionStatus("DISCONNECTED");
    addLog("Serial port disconnected.", "info");
  }, [addLog]);

  // NOTE: WiFi HTTP polling removed — data now arrives via Web Serial stream.
  // The stream callback above in handleConnect keeps sensorData updated in real-time.

  // Demo Mode Simulation Loop
  useEffect(() => {
    if (!isDemoMode) return;

    const demoInterval = setInterval(() => {
      setSensorData((prev) => {
        const demo = generateDemoSensorData(prev, countdown);
        setVitalHistory((vPrev) => [
          ...vPrev.slice(-60),
          { time: new Date().toLocaleTimeString(), heartRate: demo.heartRate, spo2: demo.spo2 }
        ]);
        return demo;
      });
    }, 1000);

    return () => clearInterval(demoInterval);
  }, [isDemoMode, countdown]);

  // Seatbelt 30-Second Countdown Logic & Vital Capture Check
  useEffect(() => {
    // Occupant is considered captured if seatbelt is fastened OR valid heart rate/pulse detected
    const occupantCaptured = sensorData.seatbelt || (sensorData.heartRate > 0) || sensorData.pulseDetected;

    if (sensorData.engine && !occupantCaptured) {
      if (!countdownTimerRef.current) {
        addLog("SEAT BELT WARNING ACTIVATED: 30-Second Countdown Started (Awaiting Seat-Belt / Vital Capture)", "warning");
        countdownTimerRef.current = setInterval(() => {
          setCountdown((prev) => {
            if (prev <= 1) {
              // Countdown reached 0: Engine Cut-Off (Car Engine Relay Pin 26 OFF)
              setSensorData((sPrev) => ({ ...sPrev, engine: false, relay: false, carEngineRelay: false }));
              addLog("🛑 CAR ENGINE STOPPED: Vitals/Seatbelt not captured within 30s. Pin 26 Engine Relay CUT-OFF triggered!", "alert");
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      }
    } else {
      if (countdownTimerRef.current) {
        clearInterval(countdownTimerRef.current);
        countdownTimerRef.current = null;
        if (sensorData.engine && occupantCaptured) {
          addLog("🟢 OCCUPANT VITAL CAPTURED / BELT SECURE: 30-Second Timer Stopped - System in Good State!", "info");
        }
      }
      setCountdown(30);
    }

    return () => {
      if (countdownTimerRef.current) {
        clearInterval(countdownTimerRef.current);
        countdownTimerRef.current = null;
      }
    };
  }, [sensorData.engine, sensorData.seatbelt, sensorData.heartRate, sensorData.pulseDetected, addLog]);

  // Evaluate Multi-Condition Emergency Logic
  useEffect(() => {
    const evalResult = evaluateEmergencyCondition(sensorData);
    if (evalResult.isEmergency && !emergencyState.isEmergency) {
      setEmergencyState(evalResult);
      addLog(`🚨 POTENTIAL EMERGENCY TRIGGERED: ${evalResult.reason}`, "alert");

      setEmergencyHistory((prev) => [
        {
          timestamp: Date.now(),
          reason: evalResult.reason,
          heartRate: sensorData.heartRate,
          spo2: sensorData.spo2,
          bodyTemp: sensorData.bodyTemp
        },
        ...prev
      ]);
    }
  }, [sensorData, emergencyState.isEmergency, addLog]);

  // Toggle Demo Mode
  const handleToggleDemoMode = () => {
    const nextState = !isDemoMode;
    setIsDemoMode(nextState);
    if (nextState) {
      setConnectionStatus("CONNECTED");
      addLog("DEMO MODE ENABLED (Hardware Emulation Active)", "info");
    } else {
      setConnectionStatus("DISCONNECTED");
      addLog("DEMO MODE DISABLED (Switched to Real Hardware Mode)", "info");
    }
  };

  // Toggle Engine — in serial mode, controls are still sent over HTTP if WiFi is available,
  // otherwise only demo mode toggle is supported.
  const handleToggleEngine = async () => {
    const nextEngine = !sensorData.engine;
    if (isDemoMode) {
      setSensorData((prev) => ({
        ...prev,
        engine: nextEngine,
        relay: nextEngine,
        carEngineRelay: nextEngine
      }));
      addLog(`Demo Vehicle Engine state toggled: ${nextEngine ? 'ON (Pin 26 HIGH)' : 'OFF (Pin 26 LOW)'}`, "info");
      return;
    }
    // In serial mode, update local state optimistically (ESP32 drives truth over serial stream)
    setSensorData((prev) => ({ ...prev, engine: nextEngine, relay: nextEngine, carEngineRelay: nextEngine }));
    addLog(`Engine state toggled locally: ${nextEngine ? 'ON' : 'OFF'} (update will reflect via serial stream)`, "info");
  };

  // Toggle Seatbelt
  const handleToggleSeatbelt = async () => {
    const nextBelt = !sensorData.seatbelt;
    if (isDemoMode) {
      setSensorData((prev) => ({ ...prev, seatbelt: nextBelt }));
      addLog(`Demo Seat-Belt state toggled: ${nextBelt ? 'FASTENED' : 'UNFASTENED'}`, "info");
      return;
    }
    setSensorData((prev) => ({ ...prev, seatbelt: nextBelt }));
    addLog(`Seat-Belt state toggled locally: ${nextBelt ? 'FASTENED' : 'UNFASTENED'} (update will reflect via serial stream)`, "info");
  };

  const handleAcknowledgeEmergency = () => {
    setEmergencyState({ isEmergency: false, reason: "" });
    addLog("Emergency state acknowledged and cleared by operator", "info");
  };

  // CSV Session Export
  const handleExportCSV = () => {
    let csv = "Time,Heart Rate (BPM),SpO2 (%),Body Temp (C),Env Temp (C),Seatbelt,Engine,CarEngineRelay,SensorPowerRelay,Emergency\n";
    vitalHistory.forEach((v) => {
      csv += `${v.time},${v.heartRate || ''},${v.spo2 || ''},${sensorData.bodyTemp || ''},${sensorData.environmentTemp || ''},${sensorData.seatbelt ? 'FASTENED' : 'UNFASTENED'},${sensorData.engine ? 'ON' : 'OFF'},${sensorData.carEngineRelay ? 'HIGH' : 'LOW'},${sensorData.sensorPowerRelay ? 'HIGH' : 'LOW'},${emergencyState.isEmergency ? 'YES' : 'NO'}\n`;
    });

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `seatbelt_surveillance_log_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    addLog("Downloaded Session Data as CSV", "info");
  };

  // Computed Values
  const safetyIndex = calculateSafetyIndex({
    ...sensorData,
    emergency: emergencyState.isEmergency
  });
  const currentBuzzerState = getBuzzerState(sensorData.engine, sensorData.seatbelt, countdown);
  const pulseDecreasing = checkPulseDecreasing(vitalHistory, sensorData.heartRate);

  return (
    <div className="app-container">
      {/* Background Graphic Frame */}
      <img src="/car-dashboard.svg" alt="Automotive Cockpit" className="dashboard-bg-svg" />

      <div className="dashboard-content">
        {/* Top Header */}
        <header className="dashboard-header">
          <div className="header-brand">
            <span className="brand-logo">🏎️</span>
            <div className="brand-title-group">
              <h1>SMART SEAT-BELT MONITOR</h1>
              <span className="brand-subtitle">AUTOMOTIVE OCCUPANT SURVEILLANCE SYSTEM</span>
            </div>
          </div>
          <div className="header-clock" style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
            <span>{currentTime}</span>
            <div style={{ padding: '4px 12px', background: 'rgba(255,255,255,0.1)', borderRadius: '20px' }}>
              👤 {userProfile?.name || 'User'}
            </div>
            <button 
              onClick={async () => { await logout(); navigate('/', { replace: true }); }}
              style={{ background: 'transparent', border: '1px solid var(--danger-red)', color: 'var(--danger-red)', padding: '4px 12px', borderRadius: '4px', cursor: 'pointer' }}
            >
              Sign Out
            </button>
          </div>
        </header>

        {/* Prioritized Warning Banner */}
        <WarningPanel
          emergency={emergencyState.isEmergency}
          engine={sensorData.engine}
          seatbelt={sensorData.seatbelt}
          countdown={countdown}
          pulseDecreasing={pulseDecreasing}
          heartRateStatus={getHeartRateStatus(sensorData.heartRate)}
          spo2Status={getSpO2Status(sensorData.spo2)}
          tempStatus={getTempStatus(sensorData.bodyTemp)}
          connectionStatus={isDemoMode ? "DEMO" : connectionStatus}
          pulseDetected={sensorData.pulseDetected}
          heartRate={sensorData.heartRate}
        />

        {/* Emergency Modal Overlay (if active) */}
        <EmergencyPanel
          emergencyState={emergencyState}
          sensorData={sensorData}
          onAcknowledge={handleAcknowledgeEmergency}
          emergencyHistory={emergencyHistory}
        />

        {/* Main Instrument Cluster 3-Column Layout */}
        <div className="cluster-main-grid">
          {/* LEFT COLUMN: Diagnostic Link & Primary Heart Rate */}
          <div className="cluster-col-left">
            <ConnectionPanel
              connectionStatus={connectionStatus}
              portLabel={portLabel}
              onConnect={handleConnect}
              onDisconnect={handleDisconnect}
              lastError={lastError}
              isDemoMode={isDemoMode}
            />

            <PulseGauge
              heartRate={sensorData.heartRate}
              pulseDetected={sensorData.pulseDetected}
            />
          </div>

          {/* CENTER COLUMN: Safety Index & Ignition / Seatbelt Controls */}
          <div className="cluster-col-center">
            <Speedometer
              safetyIndex={safetyIndex}
              statusLabel={safetyIndex >= 80 ? "SYSTEM OPTIMAL" : (safetyIndex >= 50 ? "SYSTEM WARNING" : "CRITICAL RISK")}
            />

            <EngineStatus
              engine={sensorData.engine}
              carEngineRelay={sensorData.carEngineRelay}
              sensorPowerRelay={sensorData.sensorPowerRelay}
              auxRelay={sensorData.auxRelay}
              onToggleEngine={handleToggleEngine}
              isDemoMode={isDemoMode}
            />

            <SeatbeltStatus
              seatbelt={sensorData.seatbelt}
              engine={sensorData.engine}
              countdown={countdown}
              buzzerState={currentBuzzerState}
              onToggleSeatbelt={handleToggleSeatbelt}
              isDemoMode={isDemoMode}
            />
          </div>

          {/* RIGHT COLUMN: SpO2 & Thermal Surveillance */}
          <div className="cluster-col-right">
            <SpO2Gauge spo2={sensorData.spo2} />

            <TemperaturePanel
              bodyTemp={sensorData.bodyTemp}
              environmentTemp={sensorData.environmentTemp}
            />
          </div>
        </div>

        {/* Sensor Diagnostics Matrix */}
        <SensorCards
          sensorData={sensorData}
          connectionStatus={connectionStatus}
          isDemoMode={isDemoMode}
        />

        {/* Live Wave Plot, Event Log & System Controls */}
        <SystemStatus
          connectionStatus={connectionStatus}
          isDemoMode={isDemoMode}
          onToggleDemoMode={handleToggleDemoMode}
          vitalHistory={vitalHistory}
          eventLog={eventLog}
          onExportCSV={handleExportCSV}
        />
      </div>
    </div>
  );
}
