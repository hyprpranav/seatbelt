/**
 * Calculations & Safety Logic for Smart Seat-Belt Dashboard
 * Note: Thresholds are for prototype monitoring and safety surveillance, not medical diagnosis.
 */

export const THRESHOLDS = {
  HR_NORMAL_MIN: 60,
  HR_NORMAL_MAX: 100,
  HR_CRITICAL_LOW: 45,
  HR_CRITICAL_HIGH: 130,

  SPO2_NORMAL_MIN: 95,
  SPO2_WARNING_MIN: 90,
  SPO2_CRITICAL: 88,

  BODY_TEMP_NORMAL_MIN: 36.1,
  BODY_TEMP_NORMAL_MAX: 37.3,
  BODY_TEMP_ELEVATED: 37.8,
  BODY_TEMP_HIGH: 38.5,

  SEATBELT_COUNTDOWN_SECONDS: 30,
};

/**
 * Calculates Body Temperature minus Environment Temperature.
 * @param {number|null} bodyTemp 
 * @param {number|null} envTemp 
 * @returns {number|null}
 */
export function calculateTempDiff(bodyTemp, envTemp) {
  if (bodyTemp === null || bodyTemp === undefined || envTemp === null || envTemp === undefined) {
    return null;
  }
  const diff = bodyTemp - envTemp;
  return Math.round(diff * 10) / 10;
}

/**
 * Evaluates Body Temperature status string.
 * @param {number|null} temp 
 * @returns {string}
 */
export function getTempStatus(temp) {
  if (temp === null || temp === undefined || isNaN(temp)) return "NO SIGNAL";
  if (temp >= THRESHOLDS.BODY_TEMP_NORMAL_MIN && temp <= THRESHOLDS.BODY_TEMP_NORMAL_MAX) {
    return "NORMAL";
  }
  if (temp > THRESHOLDS.BODY_TEMP_NORMAL_MAX && temp <= THRESHOLDS.BODY_TEMP_ELEVATED) {
    return "ELEVATED";
  }
  if (temp > THRESHOLDS.BODY_TEMP_ELEVATED) {
    return "ABNORMAL (HIGH)";
  }
  return "ABNORMAL (LOW)";
}

/**
 * Evaluates Heart Rate status.
 * @param {number|null} hr 
 * @returns {string}
 */
export function getHeartRateStatus(hr) {
  if (hr === null || hr === undefined || isNaN(hr) || hr === 0) return "NO SIGNAL";
  if (hr >= THRESHOLDS.HR_NORMAL_MIN && hr <= THRESHOLDS.HR_NORMAL_MAX) {
    return "NORMAL";
  }
  if (hr < THRESHOLDS.HR_NORMAL_MIN && hr >= THRESHOLDS.HR_CRITICAL_LOW) {
    return "LOW (BRADYCARDIA)";
  }
  if (hr < THRESHOLDS.HR_CRITICAL_LOW) {
    return "CRITICAL LOW";
  }
  if (hr > THRESHOLDS.HR_NORMAL_MAX && hr <= THRESHOLDS.HR_CRITICAL_HIGH) {
    return "ELEVATED (TACHYCARDIA)";
  }
  return "CRITICAL HIGH";
}

/**
 * Evaluates SpO2 status.
 * @param {number|null} spo2 
 * @returns {string}
 */
export function getSpO2Status(spo2) {
  if (spo2 === null || spo2 === undefined || isNaN(spo2) || spo2 === 0) return "NO SIGNAL";
  if (spo2 >= THRESHOLDS.SPO2_NORMAL_MIN) return "NORMAL";
  if (spo2 >= THRESHOLDS.SPO2_WARNING_MIN) return "WARNING (LOW)";
  return "CRITICAL (HYPOXIA)";
}

/**
 * Computes overall Occupant Safety Index score (0 to 100).
 * @param {Object} data 
 * @returns {number}
 */
export function calculateSafetyIndex({ engine, seatbelt, heartRate, spo2, bodyTemp, pulseDetected, emergency }) {
  if (emergency) return 15;
  
  let score = 100;
  
  // Seatbelt penalty when engine is active
  if (engine && !seatbelt) score -= 35;
  
  // Heart Rate penalty
  if (heartRate !== null && heartRate !== undefined) {
    if (heartRate < 50 || heartRate > 120) score -= 25;
    else if (heartRate < 60 || heartRate > 100) score -= 10;
  } else if (engine) {
    score -= 10; // Missing vital signal
  }

  // SpO2 penalty
  if (spo2 !== null && spo2 !== undefined) {
    if (spo2 < 90) score -= 25;
    else if (spo2 < 95) score -= 10;
  }

  // Body Temp penalty
  if (bodyTemp !== null && bodyTemp !== undefined) {
    if (bodyTemp > 38.0 || bodyTemp < 35.5) score -= 15;
  }

  if (pulseDetected === false && engine) score -= 10;

  return Math.max(0, Math.min(100, Math.round(score)));
}

/**
 * Multi-condition Potential Emergency Detection logic.
 * Avoids false alarms from a single noise point.
 * @param {Object} data 
 * @returns {{ isEmergency: boolean, reason: string }}
 */
export function evaluateEmergencyCondition({ engine, seatbelt, heartRate, spo2, bodyTemp, pulseDetected }) {
  if (!engine) {
    return { isEmergency: false, reason: "" };
  }

  const reasons = [];

  if (heartRate !== null && heartRate !== undefined && heartRate < THRESHOLDS.HR_CRITICAL_LOW && heartRate > 0) {
    reasons.push(`Sudden Heart Rate Drop (${heartRate} BPM)`);
  }

  if (spo2 !== null && spo2 !== undefined && spo2 < THRESHOLDS.SPO2_CRITICAL && spo2 > 0) {
    reasons.push(`Critical SpO2 Drop (${spo2}%)`);
  }

  if (bodyTemp !== null && bodyTemp !== undefined && bodyTemp > THRESHOLDS.BODY_TEMP_HIGH) {
    reasons.push(`Critical Hyperthermia (${bodyTemp}°C)`);
  }

  if (seatbelt && engine && pulseDetected === false && (heartRate === null || heartRate === 0)) {
    reasons.push("Loss of Occupant Vital Signals while Engine Active");
  }

  if (reasons.length > 0) {
    return {
      isEmergency: true,
      reason: reasons.join(" + ")
    };
  }

  return { isEmergency: false, reason: "" };
}

/**
 * Determines buzzer state string according to seat-belt countdown seconds.
 * @param {boolean} engine 
 * @param {boolean} seatbelt 
 * @param {number} countdownSeconds 
 * @returns {string} OFF | SLOW | FAST | CONTINUOUS
 */
export function getBuzzerState(engine, seatbelt, countdownSeconds) {
  if (!engine || seatbelt) return "OFF";
  if (countdownSeconds > 10) return "OFF";       // 0-20s elapsed
  if (countdownSeconds > 5) return "SLOW";        // 20-25s elapsed (10s to 5s remaining -> SLOW)
  if (countdownSeconds > 0) return "FAST";        // 25-30s elapsed (5s to 0s remaining -> FAST)
  return "CONTINUOUS";                            // >30s elapsed -> ENGINE CUTOFF
}

/**
 * Checks if occupant's heart rate is decreasing significantly or entering bradycardia.
 * @param {Array} vitalHistory 
 * @param {number|null} currentHR 
 * @returns {boolean}
 */
export function checkPulseDecreasing(vitalHistory = [], currentHR = null) {
  if (currentHR === null || currentHR === undefined || currentHR === 0) return false;
  if (currentHR < THRESHOLDS.HR_NORMAL_MIN) return true; // Below 60 BPM

  if (vitalHistory.length >= 5) {
    const recent = vitalHistory.slice(-5).map(v => v.heartRate).filter(h => h && h > 0);
    if (recent.length >= 3) {
      const avgPrior = recent.slice(0, -1).reduce((a, b) => a + b, 0) / (recent.length - 1);
      if (avgPrior - currentHR >= 12) {
        return true; // Sudden drop of >= 12 BPM
      }
    }
  }
  return false;
}
