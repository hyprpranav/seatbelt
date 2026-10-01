import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

import { collection, query, where, getDocs, doc, updateDoc, serverTimestamp, orderBy, limit } from 'firebase/firestore';
import { db } from '../firebase/config';

// Reuse all existing dashboard components
import ConnectionPanel from '../components/ConnectionPanel';
import SensorCards from '../components/SensorCards';
import PulseGauge from '../components/PulseGauge';
import SpO2Gauge from '../components/SpO2Gauge';
import TemperaturePanel from '../components/TemperaturePanel';
import SeatbeltStatus from '../components/SeatbeltStatus';
import EngineStatus from '../components/EngineStatus';
import SystemStatus from '../components/SystemStatus';
import WarningPanel from '../components/WarningPanel';
import EmergencyPanel from '../components/EmergencyPanel';
import Speedometer from '../components/Speedometer';

import { startSerialStream } from '../utils/serial';
import { sanitizeSensorData } from '../utils/api';
import {
  calculateSafetyIndex,
  evaluateEmergencyCondition,
  checkPulseDecreasing,
} from '../utils/calculations';

import '../styles/dashboard.css';
import '../styles/admin.css';

// ─────────────────────────────────────────────────────────
// NAV TABS
// ─────────────────────────────────────────────────────────
const TABS = ['dashboard', 'requests', 'users', 'settings'];
const TAB_LABELS = {
  dashboard: '📊 Dashboard',
  requests:  '📥 Requests',
  users:     '👥 Users',
  settings:  '⚙️ Settings',
};

export default function AdminDashboard() {
  const { currentUser, userProfile, logout } = useAuth();
  const navigate = useNavigate();

  // ── Active tab ──────────────────────────────────────────
  const [activeTab, setActiveTab] = useState('dashboard');

  // ── Firestore data ──────────────────────────────────────
  const [pendingUsers, setPendingUsers] = useState([]);
  const [approvedUsers, setApprovedUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  // ── Dashboard / sensor state (same as App.jsx) ──────────
  const [isConnected, setIsConnected]     = useState(false);
  const [isConnecting, setIsConnecting]   = useState(false);
  const [serialError, setSerialError]     = useState('');
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
  const [lastUpdate, setLastUpdate]       = useState(null);
  const [vitalHistory, setVitalHistory]   = useState([]);
  const [safetyIndex, setSafetyIndex]     = useState(100);
  const [emergency, setEmergency]         = useState(false);
  const [emergencyReason, setEmergencyReason] = useState('');
  const [isPulseDecreasing, setIsPulseDecreasing] = useState(false);
  const serialPortRef  = React.useRef(null);
  const serialStopRef  = React.useRef(null);

  // History Modal State
  const [viewingUser, setViewingUser] = useState(null);
  const [userHistory, setUserHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // ── Load Firestore Users ────────────────────────────────
  async function loadUsers() {
    setLoadingUsers(true);
    try {
      const usersRef = collection(db, 'users');
      // Sort by requestedAt descending
      const q = query(usersRef, orderBy('requestedAt', 'desc'));
      const snapshot = await getDocs(q);

      const allUsers = [];
      snapshot.forEach(doc => {
        allUsers.push({ id: doc.id, ...doc.data() });
      });

      setPendingUsers(allUsers.filter(u => u.status === 'pending'));
      setApprovedUsers(allUsers.filter(u => u.status === 'approved' && u.role !== 'admin'));
    } catch (err) {
      console.error('Failed to load users:', err);
    }
    setLoadingUsers(false);
  }

  useEffect(() => {
    if (activeTab === 'requests' || activeTab === 'users') {
      loadUsers();
    }
  }, [activeTab]);

  // ── Approve user ────────────────────────────────────────
  async function approveUser(uid) {
    try {
      const userRef = doc(db, 'users', uid);
      await updateDoc(userRef, {
        status: 'approved',
        approvedAt: serverTimestamp(),
      });
      loadUsers();
    } catch (err) {
      console.error('Approve failed:', err);
    }
  }

  // ── Reject user ─────────────────────────────────────────
  async function rejectUser(uid) {
    try {
      const userRef = doc(db, 'users', uid);
      await updateDoc(userRef, {
        status: 'rejected',
      });
      loadUsers();
    } catch (err) {
      console.error('Reject failed:', err);
    }
  }

  // ── View User History ───────────────────────────────────
  async function viewUserHistory(user) {
    setViewingUser(user);
    setLoadingHistory(true);
    setUserHistory([]);
    try {
      const historyRef = collection(db, 'users', user.id, 'history');
      const q = query(historyRef, orderBy('savedAt', 'desc'), limit(50));
      const snap = await getDocs(q);
      const data = [];
      snap.forEach(d => data.push({ id: d.id, ...d.data() }));
      setUserHistory(data);
    } catch (err) {
      console.error('Failed to load user history', err);
    }
    setLoadingHistory(false);
  }

  // ── Serial connect ──────────────────────────────────────
  const handleConnect = useCallback(async () => {
    setIsConnecting(true);
    setSerialError('');
    try {
      const { stop, port } = await startSerialStream((raw) => {
        const clean = sanitizeSensorData(raw);
        if (!clean) return;
        setSensorData(clean);
        setLastUpdate(new Date());
        setVitalHistory(h => {
          const next = [...h, { ...clean, time: Date.now() }].slice(-60);
          const si = calculateSafetyIndex(clean);
          setSafetyIndex(si);
          const em = evaluateEmergencyCondition(clean);
          setEmergency(em.isEmergency);
          setEmergencyReason(em.reason);
          setIsPulseDecreasing(checkPulseDecreasing(next, clean.heartRate));
          return next;
        });
      });
      serialPortRef.current = port;
      serialStopRef.current = stop;
      setIsConnected(true);
    } catch (err) {
      console.error(err);
      if (err.name !== 'NotFoundError') {
        setSerialError(err.message || 'Failed to connect to serial port.');
      }
    }
    setIsConnecting(false);
  }, []);

  const handleDisconnect = useCallback(async () => {
    if (serialStopRef.current) await serialStopRef.current();
    setIsConnected(false);
    setSensorData(null);
  }, []);

  async function handleLogout() {
    handleDisconnect();
    await logout();
    navigate('/', { replace: true });
  }

  // ── Render ──────────────────────────────────────────────
  return (
    <div className="admin-root">
      {/* ── TOP NAV ── */}
      <nav className="admin-nav">
        <div className="admin-nav-brand">
          <span>🛡️</span>
          <span>SMART SEATBELT</span>
          <span className="admin-badge">ADMIN</span>
        </div>

        <div className="admin-nav-tabs">
          {TABS.map(tab => (
            <button
              key={tab}
              className={`admin-tab ${activeTab === tab ? 'active' : ''}`}
              onClick={() => setActiveTab(tab)}
            >
              {TAB_LABELS[tab]}
            </button>
          ))}
        </div>

        <div className="admin-nav-user">
          <span className="admin-user-name">
            👤 {userProfile?.name || 'Admin'}
          </span>
          <button className="admin-logout-btn" onClick={handleLogout}>
            Sign Out
          </button>
        </div>
      </nav>

      {/* ── CONTENT ── */}
      <main className="admin-content">

        {/* ─── DASHBOARD TAB ─── */}
        {activeTab === 'dashboard' && (
          <div className="dashboard-container">
            {emergency && (
              <EmergencyPanel reason={emergencyReason} />
            )}
            <ConnectionPanel
              isConnected={isConnected}
              isConnecting={isConnecting}
              serialError={serialError}
              lastUpdate={lastUpdate}
              onConnect={handleConnect}
              onDisconnect={handleDisconnect}
            />
            <div className="dashboard-grid">
              <div className="dashboard-left">
                <EngineStatus
                  engine={sensorData.engine}
                  carEngineRelay={sensorData.carEngineRelay}
                  sensorPowerRelay={sensorData.sensorPowerRelay}
                  auxRelay={sensorData.auxRelay}
                  onToggleEngine={() => {}}
                  isDemoMode={false}
                />
                <SeatbeltStatus
                  seatbelt={sensorData.seatbelt}
                  engine={sensorData.engine}
                  countdown={30}
                  buzzerState={sensorData.buzzer}
                  onToggleSeatbelt={() => {}}
                  isDemoMode={false}
                />
                <SystemStatus
                  connectionStatus={isConnected ? 'CONNECTED' : 'DISCONNECTED'}
                  isDemoMode={false}
                  onToggleDemoMode={() => {}}
                  vitalHistory={vitalHistory}
                  eventLog={[]}
                />
              </div>
              <div className="dashboard-center">
                <Speedometer
                  safetyIndex={safetyIndex}
                  statusLabel={safetyIndex >= 80 ? "SYSTEM OPTIMAL" : (safetyIndex >= 50 ? "SYSTEM WARNING" : "CRITICAL RISK")}
                />
                <SensorCards
                  sensorData={sensorData}
                  connectionStatus={isConnected ? 'CONNECTED' : 'DISCONNECTED'}
                  isDemoMode={false}
                />
              </div>
              <div className="dashboard-right">
                <PulseGauge
                  heartRate={sensorData.heartRate}
                  pulseDetected={sensorData.pulseDetected}
                />
                <SpO2Gauge
                  spo2={sensorData.spo2}
                />
                <TemperaturePanel
                  bodyTemp={sensorData.bodyTemp}
                  environmentTemp={sensorData.environmentTemp}
                />
                <WarningPanel
                  emergency={emergency}
                  engine={sensorData.engine}
                  seatbelt={sensorData.seatbelt}
                  countdown={30}
                  pulseDecreasing={isPulseDecreasing}
                  heartRateStatus={sensorData.heartRate > 100 || sensorData.heartRate < 60 ? "CRITICAL" : "NORMAL"}
                  spo2Status={sensorData.spo2 < 90 ? "CRITICAL" : "NORMAL"}
                  tempStatus={sensorData.bodyTemp > 38.2 ? "CRITICAL" : "NORMAL"}
                  connectionStatus={isConnected ? 'CONNECTED' : 'DISCONNECTED'}
                  pulseDetected={sensorData.pulseDetected}
                  heartRate={sensorData.heartRate}
                />
              </div>
            </div>
          </div>
        )}

        {/* ─── REQUESTS TAB ─── */}
        {activeTab === 'requests' && (
          <div className="admin-panel">
            <div className="admin-panel-header">
              <h2>📥 Pending Access Requests</h2>
              <button className="admin-refresh-btn" onClick={loadUsers}>↻ Refresh</button>
            </div>

            {loadingUsers ? (
              <div className="admin-loading">Loading requests...</div>
            ) : pendingUsers.length === 0 ? (
              <div className="admin-empty">
                <span>✅</span>
                <p>No pending requests at the moment.</p>
              </div>
            ) : (
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Requested At</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingUsers.map(u => (
                      <tr key={u.id}>
                        <td>{u.name}</td>
                        <td>{u.email}</td>
                        <td>
                          {u.requestedAt?.toDate
                            ? u.requestedAt.toDate().toLocaleString('en-IN')
                            : '—'}
                        </td>
                        <td className="admin-actions">
                          <button
                            className="admin-btn admin-btn--approve"
                            onClick={() => approveUser(u.id)}
                          >
                            ✓ Approve
                          </button>
                          <button
                            className="admin-btn admin-btn--reject"
                            onClick={() => rejectUser(u.id)}
                          >
                            ✗ Reject
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ─── USERS TAB ─── */}
        {activeTab === 'users' && (
          <div className="admin-panel">
            <div className="admin-panel-header">
              <h2>👥 Approved Users</h2>
              <button className="admin-refresh-btn" onClick={loadUsers}>↻ Refresh</button>
            </div>

            {loadingUsers ? (
              <div className="admin-loading">Loading users...</div>
            ) : approvedUsers.length === 0 ? (
              <div className="admin-empty">
                <span>👤</span>
                <p>No approved users yet. Approve requests to grant access.</p>
              </div>
            ) : (
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Requested At</th>
                      <th>Approved At</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {approvedUsers.map(u => (
                      <tr key={u.id}>
                        <td>{u.name}</td>
                        <td>{u.email}</td>
                        <td>
                          {u.requestedAt?.toDate
                            ? u.requestedAt.toDate().toLocaleString('en-IN')
                            : '—'}
                        </td>
                        <td>
                          {u.approvedAt?.toDate
                            ? u.approvedAt.toDate().toLocaleString('en-IN')
                            : '—'}
                        </td>
                        <td className="admin-actions">
                          <button
                            className="admin-btn admin-btn--approve"
                            onClick={() => viewUserHistory(u)}
                            style={{ marginRight: '8px' }}
                          >
                            View Data
                          </button>
                          <button
                            className="admin-btn admin-btn--reject"
                            onClick={() => rejectUser(u.id)}
                          >
                            Revoke
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ─── SETTINGS TAB ─── */}
        {activeTab === 'settings' && (
          <div className="admin-panel">
            <div className="admin-panel-header">
              <h2>⚙️ Admin Settings</h2>
            </div>
            <div className="admin-settings-grid">
              <div className="admin-setting-card">
                <h3>Admin Account</h3>
                <p><strong>Name:</strong> {userProfile?.name}</p>
                <p><strong>Email:</strong> {userProfile?.email}</p>
                <p><strong>Role:</strong> <span className="role-badge">ADMIN</span></p>
              </div>
              <div className="admin-setting-card">
                <h3>System Info</h3>
                <p><strong>Firmware:</strong> ESP32 v2.0.0 (Serial Mode)</p>
                <p><strong>Dashboard:</strong> Smart Seatbelt Monitor v2.0</p>
                <p><strong>Baud Rate:</strong> 115200</p>
                <p><strong>Protocol:</strong> USB Web Serial API</p>
              </div>
              <div className="admin-setting-card">
                <h3>Body Temp Thresholds</h3>
                <p><strong>Normal:</strong> 36.0°C – 37.5°C</p>
                <p><strong>Elevated:</strong> 37.5°C – 38.2°C</p>
                <p><strong>Fever:</strong> &gt; 38.2°C</p>
                <p className="setting-note">Calibrated for Karur, Tamil Nadu climate</p>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ─── HISTORY MODAL ─── */}
      {viewingUser && (
        <div className="admin-modal-overlay" onClick={() => setViewingUser(null)}>
          <div className="admin-modal-content" onClick={e => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h2>📊 {viewingUser.name}'s History</h2>
              <button className="admin-modal-close" onClick={() => setViewingUser(null)}>✖</button>
            </div>
            <div className="admin-modal-body">
              {loadingHistory ? (
                <p>Loading history...</p>
              ) : userHistory.length === 0 ? (
                <p>No sensor data recorded for this user yet.</p>
              ) : (
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Time</th>
                      <th>Heart Rate</th>
                      <th>SpO2</th>
                      <th>Body Temp</th>
                      <th>Seatbelt</th>
                      <th>Engine</th>
                      <th>Emergency</th>
                    </tr>
                  </thead>
                  <tbody>
                    {userHistory.map(h => (
                      <tr key={h.id}>
                        <td>{h.savedAt?.toDate ? h.savedAt.toDate().toLocaleTimeString('en-IN') : '—'}</td>
                        <td>{h.heartRate} BPM</td>
                        <td>{h.spo2}%</td>
                        <td>{h.bodyTemp}°C</td>
                        <td style={{ color: h.seatbelt ? 'var(--success-green)' : 'var(--danger-red)' }}>
                          {h.seatbelt ? 'FASTENED' : 'UNFASTENED'}
                        </td>
                        <td style={{ color: h.engine ? 'var(--success-green)' : 'var(--danger-red)' }}>
                          {h.engine ? 'ON' : 'OFF'}
                        </td>
                        <td style={{ color: h.emergency ? 'var(--danger-red)' : 'var(--success-green)' }}>
                          {h.emergency ? 'YES' : 'NO'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
