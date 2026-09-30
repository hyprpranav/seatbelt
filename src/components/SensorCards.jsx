import React from 'react';

/**
 * Hardware Sensor Diagnostics & Health Matrix Card Module
 */
export default function SensorCards({ sensorData, connectionStatus, isDemoMode }) {
  const isOnline = (val) => {
    if (isDemoMode) return true;
    if (connectionStatus !== 'CONNECTED') return false;
    return val !== null && val !== undefined;
  };

  const sensors = [
    {
      id: 'ds18b20',
      name: 'DS18B20',
      role: 'Body Temperature',
      online: isOnline(sensorData.bodyTemp),
      value: sensorData.bodyTemp ? `${sensorData.bodyTemp.toFixed(1)} °C` : 'NO SIGNAL'
    },
    {
      id: 'dht11',
      name: 'DHT11',
      role: 'Environment Temp',
      online: isOnline(sensorData.environmentTemp),
      value: sensorData.environmentTemp ? `${sensorData.environmentTemp.toFixed(1)} °C` : 'NO SIGNAL'
    },
    {
      id: 'max3010x',
      name: 'MAX30100 / MAX30102',
      role: 'Heart Rate & SpO2',
      online: isOnline(sensorData.heartRate) && isOnline(sensorData.spo2),
      value: sensorData.heartRate ? `${sensorData.heartRate} BPM | ${sensorData.spo2}%` : 'NO SIGNAL'
    },
    {
      id: 'pulse',
      name: 'ANALOG PULSE SENSOR',
      role: 'Secondary Vital Signal',
      online: isDemoMode || Boolean(sensorData.pulseDetected),
      value: sensorData.pulseDetected || isDemoMode ? 'SIGNAL GOOD' : 'NO SIGNAL'
    },
    {
      id: 'esp32',
      name: 'ESP32 CONTROLLER',
      role: 'Wi-Fi HTTP Gateway',
      online: isDemoMode || connectionStatus === 'CONNECTED',
      value: isDemoMode ? 'DEMO EMULATOR' : (connectionStatus === 'CONNECTED' ? 'ONLINE' : 'OFFLINE')
    }
  ];

  return (
    <div className="sensor-cards-box">
      <div className="section-title">
        <span className="icon">⚙️</span>
        <span>HARDWARE SENSOR DIAGNOSTICS</span>
      </div>

      <div className="sensors-grid">
        {sensors.map((s) => (
          <div key={s.id} className={`sensor-card ${s.online ? 'card-online' : 'card-offline'}`}>
            <div className="card-header-row">
              <span className="sensor-name">{s.name}</span>
              <span className={`status-dot ${s.online ? 'dot-online' : 'dot-offline'}`}></span>
            </div>
            <span className="sensor-role">{s.role}</span>
            <span className="sensor-reading">{s.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
