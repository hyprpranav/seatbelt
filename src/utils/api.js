/**
 * ESP32 HTTP API Communication Module
 * Handles direct browser-to-ESP32 HTTP fetch calls with timeout and validation.
 */

/**
 * Normalizes user IP input into a clean base URL.
 * @param {string} ip 
 * @returns {string} e.g. "http://192.168.1.105"
 */
export function normalizeIP(ip) {
  if (!ip) return "";
  let clean = ip.trim();
  if (!clean.startsWith("http://") && !clean.startsWith("https://")) {
    clean = `http://${clean}`;
  }
  // Remove trailing slashes
  return clean.replace(/\/+$/, "");
}

/**
 * Checks ESP32 health endpoint (/api/health)
 * @param {string} ip 
 * @returns {Promise<{ ok: boolean, message: string }>}
 */
export async function checkESP32Health(ip) {
  const baseUrl = normalizeIP(ip);
  if (!baseUrl) {
    return { ok: false, message: "Please enter an IP address" };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 4000);

  try {
    const res = await fetch(`${baseUrl}/api/health`, {
      method: "GET",
      signal: controller.signal,
      headers: {
        "Accept": "application/json"
      }
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      return { ok: false, message: `HTTP Error ${res.status}` };
    }

    const data = await res.json();
    if (data && data.status === "ok") {
      return { ok: true, message: "ESP32 Online & Ready" };
    }
    return { ok: false, message: "Invalid Health Response" };
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === "AbortError") {
      return { ok: false, message: "Connection Timed Out" };
    }
    return { ok: false, message: "Network / CORS Error" };
  }
}

/**
 * Fetches sensor JSON data from ESP32 (/api/data)
 * @param {string} ip 
 * @returns {Promise<Object>}
 */
export async function fetchSensorData(ip) {
  const baseUrl = normalizeIP(ip);
  if (!baseUrl) {
    throw new Error("No IP provided");
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 4000);

  try {
    const res = await fetch(`${baseUrl}/api/data`, {
      method: "GET",
      signal: controller.signal,
      headers: {
        "Accept": "application/json"
      }
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      throw new Error(`HTTP ${res.status} ${res.statusText}`);
    }

    const rawData = await res.json();
    return sanitizeSensorData(rawData);
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === "AbortError") {
      throw new Error("Request Timeout");
    }
    throw err;
  }
}

/**
 * Sends Engine ON/OFF control command to ESP32 (/api/engine?state=on|off)
 * @param {string} ip 
 * @param {boolean} state 
 * @returns {Promise<{ ok: boolean, data?: any, message?: string }>}
 */
export async function controlESP32Engine(ip, state) {
  const baseUrl = normalizeIP(ip);
  if (!baseUrl) return { ok: false, message: "No IP address" };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 3000);

  try {
    const stateStr = state ? "on" : "off";
    const res = await fetch(`${baseUrl}/api/engine?state=${stateStr}`, {
      method: "GET",
      signal: controller.signal,
      headers: { "Accept": "application/json" }
    });

    clearTimeout(timeoutId);
    if (res.ok) {
      const data = await res.json();
      return { ok: true, data };
    }
    return { ok: false, message: `HTTP ${res.status}` };
  } catch (err) {
    clearTimeout(timeoutId);
    return { ok: false, message: err.message };
  }
}

/**
 * Sends Seat-Belt Fastened/Unfastened state to ESP32 (/api/seatbelt?state=fastened|unfastened)
 * @param {string} ip 
 * @param {boolean} state 
 * @returns {Promise<{ ok: boolean, data?: any, message?: string }>}
 */
export async function controlESP32Seatbelt(ip, state) {
  const baseUrl = normalizeIP(ip);
  if (!baseUrl) return { ok: false, message: "No IP address" };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 3000);

  try {
    const stateStr = state ? "fastened" : "unfastened";
    const res = await fetch(`${baseUrl}/api/seatbelt?state=${stateStr}`, {
      method: "GET",
      signal: controller.signal,
      headers: { "Accept": "application/json" }
    });

    clearTimeout(timeoutId);
    if (res.ok) {
      const data = await res.json();
      return { ok: true, data };
    }
    return { ok: false, message: `HTTP ${res.status}` };
  } catch (err) {
    clearTimeout(timeoutId);
    return { ok: false, message: err.message };
  }
}

/**
 * Validates and sanitizes incoming JSON fields to prevent React crashes.
 * @param {Object} raw 
 * @returns {Object}
 */
export function sanitizeSensorData(raw) {
  if (!raw || typeof raw !== "object") {
    throw new Error("DATA FORMAT ERROR: Received invalid non-object payload");
  }

  const sanitizeNumber = (val) => {
    if (val === null || val === undefined) return null;
    const num = Number(val);
    return isNaN(num) ? null : num;
  };

  const isEngineOn = Boolean(raw.engine);
  const isCarEngineRelayOn = raw.carEngineRelay !== undefined ? Boolean(raw.carEngineRelay) : (raw.relay !== undefined ? Boolean(raw.relay) : isEngineOn);
  const isSensorPowerRelayOn = raw.sensorPowerRelay !== undefined ? Boolean(raw.sensorPowerRelay) : true; // Always 24/7 ON
  const isAuxRelayOn = Boolean(raw.auxRelay);

  return {
    engine: isEngineOn,
    relay: isCarEngineRelayOn,
    carEngineRelay: isCarEngineRelayOn,     // Pin 26
    sensorPowerRelay: isSensorPowerRelayOn, // Pin 27 (24/7 ON)
    auxRelay: isAuxRelayOn,                 // Pin 25
    seatbelt: Boolean(raw.seatbelt),
    heartRate: sanitizeNumber(raw.heartRate),
    spo2: sanitizeNumber(raw.spo2),
    bodyTemp: sanitizeNumber(raw.bodyTemp),
    environmentTemp: sanitizeNumber(raw.environmentTemp),
    pulseDetected: Boolean(raw.pulseDetected),
    pulseValue: raw.pulseValue !== undefined ? Number(raw.pulseValue) : 0,
    buzzer: String(raw.buzzer || "OFF").toUpperCase(),
    emergency: Boolean(raw.emergency),
    timestamp: raw.timestamp || Date.now()
  };
}

/**
 * Generates smooth simulated sensor data for Demo Mode.
 * @param {Object} previousData 
 * @param {number} countdownState 
 * @returns {Object}
 */
export function generateDemoSensorData(previousData = {}, countdownState = 30) {
  const now = Date.now();
  
  // Base realistic values with minor physiological jitter
  const hrJitter = (Math.random() * 4 - 2);
  const spo2Jitter = (Math.random() * 0.8 - 0.4);
  const tempJitter = (Math.random() * 0.2 - 0.1);

  const prevHR = previousData.heartRate || 76;
  const prevSpO2 = previousData.spo2 || 98;
  const prevBodyTemp = previousData.bodyTemp || 36.6;
  const prevEnvTemp = previousData.environmentTemp || 28.5;

  const newHR = Math.min(115, Math.max(55, Math.round(prevHR + hrJitter)));
  const newSpO2 = Math.min(100, Math.max(94, Math.round(prevSpO2 + spo2Jitter)));
  const newBodyTemp = Math.min(37.5, Math.max(36.2, Math.round((prevBodyTemp + tempJitter) * 10) / 10));
  const newEnvTemp = Math.min(32.0, Math.max(26.0, Math.round((prevEnvTemp + (Math.random()*0.1 - 0.05)) * 10) / 10));

  let engine = previousData.engine !== undefined ? previousData.engine : true;
  const seatbelt = previousData.seatbelt !== undefined ? previousData.seatbelt : true;
  let carEngineRelay = true;

  if (engine && !seatbelt && countdownState <= 0) {
    // 30s elapsed without seatbelt: Car Engine Relay (Pin 26) OFF
    engine = false;
    carEngineRelay = false;
  } else {
    carEngineRelay = engine;
  }

  const buzzerState = seatbelt || !engine ? "OFF" : (countdownState > 20 ? "OFF" : (countdownState > 5 ? "SLOW" : (countdownState > 0 ? "FAST" : "CONTINUOUS")));

  return {
    engine: engine,
    relay: carEngineRelay,
    carEngineRelay: carEngineRelay,  // Pin 26
    sensorPowerRelay: true,          // Pin 27 24/7 ON
    auxRelay: false,                 // Pin 25
    seatbelt: seatbelt,
    heartRate: newHR,
    spo2: newSpO2,
    bodyTemp: newBodyTemp,
    environmentTemp: newEnvTemp,
    pulseDetected: true,
    pulseValue: Math.round(2000 + (Math.random() * 500 - 250)), // Mock raw analog value
    buzzer: buzzerState,
    emergency: previousData.emergency || false,
    timestamp: now
  };
}
