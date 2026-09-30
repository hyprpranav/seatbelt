/**
 * Web Serial API Utility — ESP32 Serial Port Communication
 * ---------------------------------------------------------
 * Provides helpers to:
 *  1. Request a COM port from the browser's native port picker
 *  2. Open the port at 115200 baud (matching ESP32 firmware)
 *  3. Stream newline-delimited JSON lines and call a callback per frame
 *  4. Cleanly disconnect and release the port
 *
 * Browser Support: Chrome 89+, Edge 89+  (requires HTTPS or localhost)
 * NOTE: Firefox and Safari do NOT support Web Serial API.
 */

/**
 * Checks if the current browser supports the Web Serial API.
 * @returns {boolean}
 */
export function isSerialSupported() {
  return typeof navigator !== 'undefined' && 'serial' in navigator;
}

/**
 * Prompts the user with the browser's native COM port picker.
 * Returns the selected SerialPort object, or throws on cancel/error.
 * @returns {Promise<SerialPort>}
 */
export async function requestSerialPort() {
  if (!isSerialSupported()) {
    throw new Error('Web Serial API is not supported in this browser. Please use Chrome or Edge.');
  }
  // The browser shows a picker with all available COM/Serial ports
  const port = await navigator.serial.requestPort();
  return port;
}

/**
 * Opens a serial port at 115200 baud (ESP32 default).
 * @param {SerialPort} port
 * @returns {Promise<void>}
 */
export async function openSerialPort(port) {
  await port.open({
    baudRate: 115200,
    dataBits: 8,
    stopBits: 1,
    parity: 'none',
    flowControl: 'none'
  });
}

/**
 * Starts streaming JSON sensor data from the ESP32 over the serial port.
 * Reads newline-delimited JSON lines and calls `onData(parsedObject)` for each valid frame.
 * Calls `onError(errorMessage)` if the stream breaks.
 *
 * Returns a `stop` function — call it to disconnect and release the port.
 *
 * @param {SerialPort} port - An already-open SerialPort
 * @param {(data: Object) => void} onData - Called with each parsed JSON sensor frame
 * @param {(msg: string) => void} onError - Called on stream errors
 * @returns {{ stop: () => Promise<void> }}
 */
export function startSerialStream(port, onData, onError) {
  let cancelled = false;
  let reader = null;

  const run = async () => {
    const decoder = new TextDecoderStream();
    const readableStreamClosed = port.readable.pipeTo(decoder.writable).catch(() => {});
    reader = decoder.readable.getReader();

    let buffer = '';

    try {
      while (!cancelled) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += value;

        // Process all complete lines in the buffer
        let newlineIdx;
        while ((newlineIdx = buffer.indexOf('\n')) !== -1) {
          const line = buffer.slice(0, newlineIdx).trim();
          buffer = buffer.slice(newlineIdx + 1);

          if (!line) continue;

          // Try to parse JSON — ESP32 prints sensor JSON lines to Serial
          try {
            const parsed = JSON.parse(line);
            if (parsed && typeof parsed === 'object') {
              onData(parsed);
            }
          } catch {
            // Non-JSON line (debug print, boot message, etc.) — silently ignore
          }
        }
      }
    } catch (err) {
      if (!cancelled) {
        onError(`Serial Read Error: ${err.message}`);
      }
    } finally {
      try {
        reader.releaseLock();
      } catch {}
      await readableStreamClosed;
    }
  };

  run();

  const stop = async () => {
    cancelled = true;
    try {
      if (reader) await reader.cancel();
    } catch {}
    try {
      await port.close();
    } catch {}
  };

  return { stop };
}

/**
 * Gets a display-friendly name/label for the connected serial port.
 * Uses USB vendor/product IDs if available.
 * @param {SerialPort} port
 * @returns {string}
 */
export function getPortLabel(port) {
  if (!port) return 'Unknown Port';
  const info = port.getInfo?.() || {};
  if (info.usbVendorId && info.usbProductId) {
    return `USB Serial (VID:${info.usbVendorId.toString(16).toUpperCase()} PID:${info.usbProductId.toString(16).toUpperCase()})`;
  }
  return 'Serial Port';
}
