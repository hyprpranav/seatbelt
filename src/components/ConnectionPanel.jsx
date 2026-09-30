import React from 'react';
import { isSerialSupported } from '../utils/serial';

/**
 * Serial Port Connection Panel
 * Replaces IP-based WiFi connection with browser Web Serial API (COM port).
 * Clicking "CONNECT PORT" opens the browser's native serial port picker.
 */
export default function ConnectionPanel({
  connectionStatus,
  portLabel,
  onConnect,
  onDisconnect,
  lastError,
  isDemoMode
}) {
  const serialSupported = isSerialSupported();

  const getStatusBadge = () => {
    if (isDemoMode) {
      return (
        <span className="status-indicator status-demo">
          <span className="dot dot-demo"></span> DEMO MODE
        </span>
      );
    }

    switch (connectionStatus) {
      case 'CONNECTED':
        return (
          <span className="status-indicator status-connected">
            <span className="dot dot-green"></span> CONNECTED
          </span>
        );
      case 'CONNECTING':
        return (
          <span className="status-indicator status-connecting">
            <span className="dot dot-yellow"></span> CONNECTING...
          </span>
        );
      case 'TIMEOUT':
        return (
          <span className="status-indicator status-warning">
            <span className="dot dot-orange"></span> DATA TIMEOUT
          </span>
        );
      case 'ERROR':
        return (
          <span className="status-indicator status-error">
            <span className="dot dot-red"></span> SERIAL ERROR
          </span>
        );
      default:
        return (
          <span className="status-indicator status-disconnected">
            <span className="dot dot-red"></span> DISCONNECTED
          </span>
        );
    }
  };

  const isConnected = connectionStatus === 'CONNECTED' && !isDemoMode;

  return (
    <div className="connection-panel">
      <div className="panel-header">
        <span className="icon">🔌</span>
        <span className="panel-title">ESP32 SERIAL LINK</span>
      </div>

      {/* Port info row */}
      <div className="serial-port-info">
        <span className="input-prefix">PORT:</span>
        <span className="serial-port-label" title={portLabel || 'No port selected'}>
          {portLabel || (isConnected ? 'Connected' : 'Not selected')}
        </span>
      </div>

      {/* Baud rate display */}
      <div className="serial-baud-row">
        <span className="baud-label">BAUD:</span>
        <span className="baud-value">115200</span>
      </div>

      {/* Connect / Disconnect button */}
      {!serialSupported ? (
        <div className="serial-unsupported-msg">
          ⚠️ Web Serial not supported.<br />Use Chrome or Edge browser.
        </div>
      ) : isConnected ? (
        <button
          type="button"
          className="btn btn-disconnect"
          onClick={onDisconnect}
        >
          DISCONNECT
        </button>
      ) : (
        <button
          type="button"
          className="btn btn-connect"
          onClick={onConnect}
          disabled={isDemoMode || connectionStatus === 'CONNECTING'}
        >
          {connectionStatus === 'CONNECTING' ? 'OPENING...' : 'CONNECT PORT'}
        </button>
      )}

      {/* Status badge + error */}
      <div className="connection-status-row">
        {getStatusBadge()}
        {lastError && (
          <span className="error-text" title={lastError}>
            {lastError}
          </span>
        )}
      </div>
    </div>
  );
}
