import React from 'react';

/**
 * Prioritized Automotive Warning Panel
 */
export default function WarningPanel({
  emergency,
  engine,
  seatbelt,
  countdown,
  pulseDecreasing,
  heartRateStatus,
  spo2Status,
  tempStatus,
  connectionStatus,
  pulseDetected,
  heartRate
}) {
  const getActiveWarning = () => {
    if (emergency) {
      return {
        level: 'CRITICAL',
        icon: '🚨',
        title: 'POTENTIAL EMERGENCY ACTIVE',
        detail: 'Immediate occupant verification required!',
        blinkClass: 'blink-fast'
      };
    }

    if (connectionStatus !== 'CONNECTED' && connectionStatus !== 'DEMO') {
      return {
        level: 'WARNING',
        icon: '📡',
        title: 'ESP32 DISCONNECTED',
        detail: 'Check Wi-Fi network and microcontroller IP connection.',
        blinkClass: ''
      };
    }

    if (!engine && !seatbelt && countdown === 0) {
      return {
        level: 'CRITICAL',
        icon: '🛑',
        title: 'CAR ENGINE STOPPED',
        detail: 'You have not worn seat belt! Kindly wear seat belt to restart.',
        blinkClass: 'blink-fast'
      };
    }

    const occupantCaptured = seatbelt || (heartRate > 0) || pulseDetected;

    if (engine && !occupantCaptured) {
      if (countdown <= 5 && countdown > 0) {
        return {
          level: 'CRITICAL',
          icon: '🚨',
          title: 'EMERGENCY SEAT BELT WARNING (FAST BLINK)',
          detail: `Car engine shutting down in ${countdown} seconds! Fasten seat-belt / place finger on vital sensor!`,
          blinkClass: 'blink-fast'
        };
      }
      if (countdown <= 10 && countdown > 5) {
        return {
          level: 'WARNING',
          icon: '⚠️',
          title: 'SEAT BELT WARNING (SLOW BLINK)',
          detail: `Vitals/Seatbelt not captured while engine active. Shutdown in ${countdown} seconds!`,
          blinkClass: 'blink-slow'
        };
      }
      return {
        level: 'ALERT',
        icon: '⚠️',
        title: 'SEAT BELT / VITAL SIGN REQUIRED',
        detail: `Awaiting seat-belt fastening or vital sign capture. Shutdown timer: ${countdown}s`,
        blinkClass: ''
      };
    }

    if (pulseDecreasing) {
      return {
        level: 'WARNING',
        icon: '💔',
        title: 'WARNING: DRIVER PULSE DECREASING',
        detail: 'Occupant heart rate is dropping significantly! Potential fatigue or emergency!',
        blinkClass: 'blink-slow'
      };
    }

    if (heartRateStatus && heartRateStatus.includes('CRITICAL')) {
      return {
        level: 'CRITICAL',
        icon: '❤️',
        title: 'HEART RATE CRITICAL',
        detail: `Physiological signal alert: ${heartRateStatus}`,
        blinkClass: 'blink-fast'
      };
    }

    if (spo2Status && spo2Status.includes('CRITICAL')) {
      return {
        level: 'CRITICAL',
        icon: '🫁',
        title: 'SpO2 HYPOXIA CRITICAL',
        detail: `Oxygen saturation below critical threshold: ${spo2Status}`,
        blinkClass: 'blink-fast'
      };
    }

    if (tempStatus && tempStatus.includes('ABNORMAL')) {
      return {
        level: 'WARNING',
        icon: '🌡️',
        title: 'ABNORMAL BODY TEMPERATURE',
        detail: `Thermal surveillance alert: ${tempStatus}`,
        blinkClass: ''
      };
    }

    return {
      level: 'NORMAL',
      icon: '🟢',
      title: 'OCCUPANT DETECTED & VITAL CAPTURED: SYSTEM IN GOOD STATE',
      detail: 'Vehicle engine active, occupant vital signals captured & seat-belt secure. System operational.',
      blinkClass: ''
    };
  };

  const warning = getActiveWarning();

  return (
    <div className={`warning-banner-box level-${warning.level.toLowerCase()} ${warning.blinkClass}`}>
      <div className="warning-icon-box">{warning.icon}</div>
      <div className="warning-text-group">
        <span className="warning-title-text">{warning.title}</span>
        <span className="warning-detail-text">{warning.detail}</span>
      </div>
      <div className="warning-level-pill">{warning.level}</div>
    </div>
  );
}
