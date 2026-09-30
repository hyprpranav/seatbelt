# Smart Seat-Belt Occupant Monitoring & Vital Sensing System

A college IoT project featuring a futuristic **automotive digital instrument cluster** connected directly via Wi-Fi HTTP API to an ESP32 microcontroller monitoring occupant safety, seat-belt status, heart rate, blood oxygen (SpO2), body temperature, cabin environment temperature, and engine ignition.

---

## 🚗 Core Architecture

```
[ ESP32 + Sensors ] 
    ├── DS18B20 (Waterproof Body Temp)
    ├── DHT11 (Environment Temp & Humidity)
    ├── MAX30100 / MAX30102 (Heart Rate & SpO2)
    ├── Analog Pulse Sensor (Secondary HR)
    ├── Seat-Belt & Engine Digital Switches
    └── Active/Passive Buzzer Output
         │
         │ (Wi-Fi Local Network — HTTP GET /api/data)
         ▼
[ Web Browser Dashboard ] (React + Vite)
    ├── Local IP Connection Diagnostic
    ├── Calculations Engine (Body-Env ΔT, Safety Score, Countdown)
    ├── Automotive Digital Instrument Cluster Layout
    ├── Prioritized Warning Banner & Emergency Alert Overlay
    └── Presentation Demo Mode & CSV Session Exporter
```

> **Note**: There is zero backend middleware (No Node/Express, Flask, Django, database, or cloud required). The browser communicates directly with the ESP32 IP address.

---

## 🛠️ Technology Stack

- **Frontend**: React 18, Vite, HTML5, CSS3, Native Canvas & SVG
- **Embedded Firmware**: ESP32 C++ (Arduino Framework)
- **Design System**: Modern automotive glassmorphism digital cluster with Orbitron & Share Tech Mono technical fonts.

---

## 📁 Required Project Structure

```
smart-seatbelt-monitor/
├── package.json
├── vite.config.js
├── index.html
├── README.md
├── public/
│   └── car-dashboard.svg           # Automotive cockpit cluster background
├── src/
│   ├── main.jsx
│   ├── App.jsx                     # Core application orchestrator
│   ├── components/
│   │   ├── ConnectionPanel.jsx     # ESP32 IP Diagnostic widget
│   │   ├── EngineStatus.jsx        # Vehicle Ignition status badge
│   │   ├── SeatbeltStatus.jsx      # Seat-Belt status & 30s countdown
│   │   ├── Speedometer.jsx         # Occupant Safety Index circular gauge
│   │   ├── PulseGauge.jsx          # Primary Heart Rate & Pulse signal
│   │   ├── SpO2Gauge.jsx           # Blood Oxygen % circular arc gauge
│   │   ├── TemperaturePanel.jsx    # Dual Temp & Delta (Body - Env) panel
│   │   ├── EmergencyPanel.jsx      # Emergency overlay & history log
│   │   ├── WarningPanel.jsx        # Prioritized warning banner
│   │   ├── SensorCards.jsx         # Sensor health diagnostics matrix
│   │   └── SystemStatus.jsx        # PPG wave canvas, event log & controls
│   ├── styles/
│   │   ├── global.css              # Color tokens, typography, resets
│   │   ├── dashboard.css           # Glassmorphism, grid layout & glowing gauges
│   │   └── responsive.css          # Responsive scaling rules
│   └── utils/
│       ├── calculations.js         # Delta temp, safety index & threshold logic
│       └── api.js                  # ESP32 HTTP fetch, health check & demo generator
└── esp32/
    └── smart_seatbelt_esp32.ino    # ESP32 Arduino firmware
```

---

## 🔌 Hardware Wiring & Pin Mapping

Configure pins inside `esp32/smart_seatbelt_esp32.ino`:

| Sensor / Module | Function | ESP32 GPIO Pin |
|---|---|---|
| **DS18B20** | Body Temperature | `GPIO 4` |
| **DHT11** | Environment Temp | `GPIO 15` |
| **Pulse Sensor** | Secondary Pulse | `GPIO 34` (Analog Input) |
| **Seat-Belt Switch**| Digital Seatbelt Switch | `GPIO 16` (Pull-Up) |
| **Engine Switch** | Ignition ON/OFF | `GPIO 17` (Pull-Down) |
| **Buzzer** | Warning Beep | `GPIO 18` |
| **MAX3010x SDA** | I2C Data | `GPIO 21` |
| **MAX3010x SCL** | I2C Clock | `GPIO 22` |

---

## 🚀 Quick Start Guide

### 1. Flash the ESP32 Firmware
1. Open `esp32/smart_seatbelt_esp32.ino` in Arduino IDE.
2. Update Wi-Fi credentials at top of the file:
   ```cpp
   const char* WIFI_SSID     = "YOUR_WIFI_NAME";
   const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";
   ```
3. Upload firmware to ESP32.
4. Open Serial Monitor (`115200` baud) to copy the printed IP address (e.g. `192.168.1.105`).

### 2. Start the Frontend Dashboard
1. Open terminal in `smart-seatbelt-monitor/`:
   ```bash
   npm install
   ```
2. Launch development server:
   ```bash
   npm run dev
   ```
3. The browser will automatically open `http://localhost:5173`.
4. Enter the ESP32 IP Address in the top-left diagnostic panel and click **CONNECT**.

---

## ⚡ Presentation Demo Mode

If hardware is unavailable or disconnected during a college presentation:
1. Click the **`⚡ DEMO MODE: OFF`** toggle button on the dashboard.
2. The dashboard activates realistic simulated sensor data, allowing interactive demonstration of:
   - Vehicle Ignition ON/OFF toggles
   - Seat-Belt Fasten / Unfasten 30-second countdown and warning beeps
   - Temperature comparison calculation ($\Delta T$)
   - Vital wave graphics and emergency alert overlays

---

## 📡 API Reference

### `GET /api/data`
Returns current JSON payload:
```json
{
  "engine": true,
  "seatbelt": true,
  "heartRate": 78,
  "spo2": 98,
  "bodyTemp": 36.7,
  "environmentTemp": 29.4,
  "pulseDetected": true,
  "buzzer": "OFF",
  "emergency": false,
  "timestamp": 123456789
}
```

### `GET /api/health`
Returns health check payload:
```json
{
  "status": "ok"
}
```

---

## 🔧 Troubleshooting

- **ESP32 Connection Failed**: Verify computer and ESP32 are connected to the exact same Wi-Fi access point.
- **Browser Blocking Fetch / CORS**: ESP32 responses include `Access-Control-Allow-Origin: *`. Ensure no local firewall blocks port 80.
- **Sensor shows NO SIGNAL**: Ensure GPIO pins match your wiring and that the physical sensor pins are secure.
- **MAX3010x Initialization Error**: Verify I2C pullup resistors and `#define USE_MAX30102` configuration in the sketch.
