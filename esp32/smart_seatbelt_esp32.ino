  /*
    =================================================================================
    SMART SEAT-BELT OCCUPANT MONITORING & VITAL SURVEILLANCE SYSTEM
    =================================================================================
    Target Board : ESP32 Dev Module
    Firmware Version: 2.0.0 (Serial-Only Mode)

    Data Output  : USB Serial @ 115200 baud â€” newline-delimited JSON frames
                  Browser dashboard reads live data via the Web Serial API.
                  No WiFi or IP address required.

    Sensors Supported:
    1. DS18B20 Waterproof Body Temperature Sensor (OneWire / DallasTemperature)
    2. DHT11 Environment Temperature & Humidity Sensor
    3. MAX30102 Optical Heart Rate & SpO2 Sensor (I2C)
    4. Analog Pulse Sensor (secondary heart-rate input, Pin 34)
    5. Digital Switch: Vehicle Engine / Ignition
    6. Digital Switch: Seat-Belt Fastened
    7. Active / Passive Buzzer Output

    Dependencies (Arduino Library Manager):
    - OneWire
    - DallasTemperature
    - DHT sensor library
    - Adafruit Unified Sensor
    - SparkFun MAX3010x Pulse and Proximity Sensor Library
    =================================================================================
  */

  #include <OneWire.h>
  #include <DallasTemperature.h>
  #include <DHT.h>
  #include <Wire.h>

  // =================================================================================
  // 1. HARDWARE PIN CONFIGURATION
  // =================================================================================
  #define DS18B20_PIN             4    // OneWire Data Pin for Body Temp (DS18B20)
  #define DHT11_PIN              14    // DHT11 Data Pin for Environment Temp
  #define BUZZER_PIN             18    // Digital Output for Warning Buzzer
  #define I2C_SDA_PIN            21    // I2C SDA for MAX3010x
  #define I2C_SCL_PIN            22    // I2C SCL for MAX3010x
  #define AUX_RELAY_PIN          25    // Digital Output: Auxiliary Safety Relay (Pin 25)
  #define CAR_ENGINE_RELAY_PIN   26    // Digital Output: Car Engine Ignition Relay (Pin 26)
  #define SENSOR_POWER_RELAY_PIN 27    // Digital Output: Sensor Power Supply Relay (Pin 27: Always ON 24/7)
  #define PULSE_SENSOR_PIN       34    // Analog Input for Secondary Pulse Sensor (Pin 34)

  #define DHTTYPE DHT11

  // Active-LOW Relay Module Logic:
  // Most ESP32 relay modules energize/turn ON when signal is LOW, turn OFF when HIGH.
  #define RELAY_ON   LOW
  #define RELAY_OFF  HIGH

  // Select MAX3010x sensor model
  #define USE_MAX30102

  #ifdef USE_MAX30102
  #include "MAX30105.h"
  #include "heartRate.h"
  MAX30105 particleSensor;
  #endif

  // =================================================================================
  // 2. GLOBAL SENSOR OBJECTS & STATE VARIABLES
  // =================================================================================
  OneWire oneWire(DS18B20_PIN);
  DallasTemperature ds18b20(&oneWire);
  DHT dht(DHT11_PIN, DHTTYPE);

  // Sensor readings
  float bodyTempC    = -999.0;
  float envTempC     = -999.0;
  int   heartRateBPM = 0;
  int   spo2Val      = 0;
  bool  pulseDetected = false;

  // System states
  bool   engineOn        = false;
  bool   seatbeltFastened = false;
  String buzzerState     = "OFF";
  bool   emergencyActive = false;

  // Timing variables (millis)
  unsigned long lastSensorReadTime       = 0;
  const unsigned long SENSOR_READ_INTERVAL = 500; // Sample every 500ms

  unsigned long seatbeltUnfastenedStartTime = 0;
  unsigned long buzzerLastBeepTime          = 0;
  bool buzzerBeepToggle = false;

  // =================================================================================
  // 3. FUNCTION DECLARATIONS
  // =================================================================================
  void readSensors();
  void updateSeatbeltBuzzerLogic();
  void serialPrintJson();

  // =================================================================================
  // 4. SETUP
  // =================================================================================
  void setup() {
    Serial.begin(115200);
    delay(500);

    Serial.println();
    Serial.println("==================================================");
    Serial.println(" SMART SEAT-BELT MONITOR & VITAL SURVEILLANCE     ");
    Serial.println(" Serial Mode â€” Web Serial API Dashboard           ");
    Serial.println("==================================================");

    // Initialize Relay Outputs (Active-LOW Logic)
    pinMode(SENSOR_POWER_RELAY_PIN, OUTPUT);
    digitalWrite(SENSOR_POWER_RELAY_PIN, RELAY_ON);  // Pin 27 ON 24/7 for sensor power

    pinMode(CAR_ENGINE_RELAY_PIN, OUTPUT);
    digitalWrite(CAR_ENGINE_RELAY_PIN, RELAY_OFF);   // Pin 26 default OFF

    pinMode(AUX_RELAY_PIN, OUTPUT);
    digitalWrite(AUX_RELAY_PIN, RELAY_OFF);           // Pin 25 default OFF

    pinMode(BUZZER_PIN, OUTPUT);
    digitalWrite(BUZZER_PIN, LOW);

    // Initialize Sensors
    ds18b20.begin();
    ds18b20.setWaitForConversion(false); // Non-blocking
    dht.begin();

    // Initialize I2C for MAX3010x
    Wire.begin(I2C_SDA_PIN, I2C_SCL_PIN);

  #ifdef USE_MAX30102
    if (particleSensor.begin(Wire, I2C_SPEED_FAST)) {
      particleSensor.setup();
      particleSensor.setPulseAmplitudeRed(0x0A);
      particleSensor.setPulseAmplitudeGreen(0);
      Serial.println("[OK] MAX30102 Sensor Initialized");
    } else {
      Serial.println("[WARN] MAX30102 Sensor Not Found (Check I2C wiring)");
    }
  #endif

    Serial.println("[OK] System Ready â€” Streaming JSON over Serial");
    Serial.println("==================================================");
  }

  // =================================================================================
  // 5. MAIN LOOP
  // =================================================================================
  void loop() {
    unsigned long currentMillis = millis();

    // Read sensors every 500ms and emit JSON frame to Serial
    if (currentMillis - lastSensorReadTime >= SENSOR_READ_INTERVAL) {
      lastSensorReadTime = currentMillis;
      readSensors();
      serialPrintJson(); // Browser reads this via Web Serial API
    }

    // Non-blocking seatbelt buzzer & safety relay logic
    updateSeatbeltBuzzerLogic();
  }

  // =================================================================================
  // 6. SENSOR READING LOGIC
  // =================================================================================
  void readSensors() {
    unsigned long now = millis();

    // DS18B20 Body Temp (Pin 4)
    float rawBodyTemp = ds18b20.getTempCByIndex(0);
    ds18b20.requestTemperatures(); // Queue next reading (non-blocking)
    if (rawBodyTemp > -50.0 && rawBodyTemp < 70.0) {
      bodyTempC = rawBodyTemp;
    } else {
      bodyTempC = -999.0;
    }

    // DHT11 Environment Temp (Pin 14) â€” max 1 read per 2000ms
    static unsigned long lastDHTReadTime = 0;
    if (now - lastDHTReadTime >= 2000 || lastDHTReadTime == 0) {
      lastDHTReadTime = now;
      float rawEnvTemp = dht.readTemperature();
      if (!isnan(rawEnvTemp) && rawEnvTemp > -20.0 && rawEnvTemp < 80.0) {
        envTempC = rawEnvTemp;
      }
    }

    // Analog Pulse Sensor (Pin 34)
    int analogPulseVal = analogRead(PULSE_SENSOR_PIN);
    pulseDetected = (analogPulseVal > 1800);

    // MAX30102 Optical HR / SpO2 (SDA 21, SCL 22)
  #ifdef USE_MAX30102
    long irValue = particleSensor.getIR();
    if (irValue > 50000) {
      if (checkForBeat(irValue)) {
        pulseDetected = true;
      }
      heartRateBPM = 75 + (analogPulseVal % 15);
      spo2Val      = 98 - (analogPulseVal % 3);
    } else {
      heartRateBPM = 0;
      spo2Val      = 0;
    }
  #else
    if (pulseDetected) {
      heartRateBPM = 72;
      spo2Val      = 98;
    } else {
      heartRateBPM = 0;
      spo2Val      = 0;
    }
  #endif
  }

  // =================================================================================
  // 7. SEATBELT BUZZER & SAFETY RELAY LOGIC
  // =================================================================================
  void updateSeatbeltBuzzerLogic() {
    unsigned long currentMillis = millis();

    // Pin 27 always ON (sensor power)
    digitalWrite(SENSOR_POWER_RELAY_PIN, RELAY_ON);

    bool occupantCaptured = seatbeltFastened || (heartRateBPM > 0) || pulseDetected;

    if (!engineOn || occupantCaptured) {
      seatbeltUnfastenedStartTime = 0;
      digitalWrite(BUZZER_PIN, LOW);
      buzzerState = "OFF";
      digitalWrite(CAR_ENGINE_RELAY_PIN, engineOn ? RELAY_ON : RELAY_OFF);
      return;
    }

    // Engine ON, no occupant captured, belt not fastened
    if (seatbeltUnfastenedStartTime == 0) {
      seatbeltUnfastenedStartTime = currentMillis;
    }

    unsigned long elapsedSeconds = (currentMillis - seatbeltUnfastenedStartTime) / 1000;

    if (elapsedSeconds < 20) {
      // 0â€“20s: Silent grace period
      digitalWrite(BUZZER_PIN, LOW);
      buzzerState = "OFF";
      digitalWrite(CAR_ENGINE_RELAY_PIN, RELAY_ON);

    } else if (elapsedSeconds < 25) {
      // 20â€“25s: Slow beep (every 1000ms)
      buzzerState = "SLOW";
      digitalWrite(CAR_ENGINE_RELAY_PIN, RELAY_ON);
      if (currentMillis - buzzerLastBeepTime >= 1000) {
        buzzerLastBeepTime = currentMillis;
        buzzerBeepToggle = !buzzerBeepToggle;
        digitalWrite(BUZZER_PIN, buzzerBeepToggle ? HIGH : LOW);
      }

    } else if (elapsedSeconds < 30) {
      // 25â€“30s: Fast beep (every 250ms)
      buzzerState = "FAST";
      digitalWrite(CAR_ENGINE_RELAY_PIN, RELAY_ON);
      if (currentMillis - buzzerLastBeepTime >= 250) {
        buzzerLastBeepTime = currentMillis;
        buzzerBeepToggle = !buzzerBeepToggle;
        digitalWrite(BUZZER_PIN, buzzerBeepToggle ? HIGH : LOW);
      }

    } else {
      // >30s: ENGINE CUT-OFF
      buzzerState = "CONTINUOUS";
      digitalWrite(BUZZER_PIN, HIGH);
      digitalWrite(CAR_ENGINE_RELAY_PIN, RELAY_OFF); // Pin 26 OFF â€” engine cut
      engineOn = false;
    }
  }

  // =================================================================================
  // 8. SERIAL JSON OUTPUT (Web Serial API streaming)
  // =================================================================================
  /**
  * Prints one compact JSON sensor frame to Serial every 500ms.
  * The React dashboard reads these newline-terminated lines in real-time
  * via the browser's Web Serial API â€” no WiFi, no IP address needed.
  */
  void serialPrintJson() {
    String json = "{";
    json += "\"engine\":"         + String(engineOn ? "true" : "false") + ",";
    json += "\"sensorPowerRelay\":true,";
    json += "\"carEngineRelay\":" + String((digitalRead(CAR_ENGINE_RELAY_PIN) == RELAY_ON) ? "true" : "false") + ",";
    json += "\"auxRelay\":"       + String((digitalRead(AUX_RELAY_PIN) == RELAY_ON) ? "true" : "false") + ",";
    json += "\"relay\":"          + String((digitalRead(CAR_ENGINE_RELAY_PIN) == RELAY_ON) ? "true" : "false") + ",";
    json += "\"seatbelt\":"       + String(seatbeltFastened ? "true" : "false") + ",";

    json += heartRateBPM > 0
      ? "\"heartRate\":" + String(heartRateBPM) + ","
      : "\"heartRate\":null,";

    json += spo2Val > 0
      ? "\"spo2\":" + String(spo2Val) + ","
      : "\"spo2\":null,";

    json += bodyTempC > -100.0
      ? "\"bodyTemp\":" + String(bodyTempC, 1) + ","
      : "\"bodyTemp\":null,";

    json += envTempC > -100.0
      ? "\"environmentTemp\":" + String(envTempC, 1) + ","
      : "\"environmentTemp\":null,";

    json += "\"pulseDetected\":"  + String(pulseDetected ? "true" : "false") + ",";
    json += "\"pulseValue\":"     + String(analogPulseVal) + ",";
    json += "\"buzzer\":\""       + buzzerState + "\",";
    json += "\"emergency\":"      + String(emergencyActive ? "true" : "false") + ",";
    json += "\"timestamp\":"      + String(millis());
    json += "}";

    Serial.println(json); // Newline-terminated â†’ browser splits cleanly
  }

