/*
 * ==============================================================================
 * UTM Lab — Firmware de Control e Instrumentación v1.0
 * Microcontrolador: Arduino Uno / Nano (ATmega328P)
 * 
 * Protocolo Serial v1 compatible con la plataforma web UTM Lab:
 * - Comunicación bidireccional a 115200 baudios.
 * - Confirmaciones con UUID (ACK,id=...,status=OK / ERROR).
 * - Cálculo de CRC-16/CCITT en cada trama SAMPLE.
 * - Parada de seguridad por sobrecarga (> 100 N), final de carrera y paro de emergencia.
 * ==============================================================================
 */

// --- ASIGNACIÓN DE PINES (Ajustar según cableado físico del prototipo) ---
const int PIN_EMERGENCY_STOP = 2;   // Paro de emergencia (Normalmente cerrado / Pull-up)
const int PIN_LIMIT_TOP      = 3;   // Final de carrera superior
const int PIN_LIMIT_BOTTOM   = 4;   // Final de carrera inferior

// Driver motor paso a paso (NEMA 17 con A4988 / DRV8825 o similar)
const int PIN_STEP           = 5;   // Pulso de paso
const int PIN_DIR            = 6;   // Dirección de avance (tracción)
const int PIN_ENABLE         = 7;   // Habilitación de driver (LOW = activo)

// --- ESTADOS DE LA MÁQUINA ---
enum MachineState {
  STATE_READY,       // En espera de conexión o armado
  STATE_ARMED,       // Parámetros cargados, listo para iniciar tracción
  STATE_RUNNING,     // Ensayo en curso, motor en movimiento, adquiriendo datos
  STATE_STOPPED,     // Ensayo detenido o finalizado normalmente
  STATE_FAULT        // Error de seguridad (paro, límite o sobrecarga)
};

MachineState currentState = STATE_READY;

// --- VARIABLES DEL PROTOCOLO Y CONTROL ---
char rxBuffer[160];
int rxIndex = 0;

unsigned long testStartMillis = 0;
unsigned long lastSampleMillis = 0;
const unsigned long SAMPLE_INTERVAL_MS = 100; // Frecuencia de muestreo: 10 Hz (100 ms)

unsigned long sampleSequence = 0;
char lastCalibrationProfile[32] = "DEFAULT_V1";

// Variables cinemáticas y mecánicas simuladas/reales
// NOTA: Reemplazar con las lecturas reales de su ADC (HX711) y contador de pasos
float currentForceN = 0.0;
float currentDisplacementMm = 0.0;
long rawForceAdc = 0;
long rawDisplacementSteps = 0;

const float MAX_FORCE_LIMIT_N = 100.0; // Límite máximo de seguridad del proyecto

// ==============================================================================
// CÁLCULO DE CRC-16/CCITT (Polinomio 0x1021, Valor inicial 0xFFFF)
// Idéntico a la función de verificación en TypeScript de la plataforma web
// ==============================================================================
uint16_t calculateCrc16Ccitt(const char* data, size_t length) {
  uint16_t crc = 0xFFFF;
  for (size_t i = 0; i < length; i++) {
    crc ^= ((uint16_t)data[i]) << 8;
    for (uint8_t bit = 0; bit < 8; bit++) {
      if (crc & 0x8000) {
        crc = ((crc << 1) ^ 0x1021) & 0xFFFF;
      } else {
        crc = (crc << 1) & 0xFFFF;
      }
    }
  }
  return crc;
}

// ==============================================================================
// UTILIDADES PARA EXTRAER PARÁMETROS DEL COMANDO
// ==============================================================================
bool getParamValue(const char* line, const char* key, char* output, size_t maxLen) {
  char searchKey[32];
  snprintf(searchKey, sizeof(searchKey), "%s=", key);
  const char* pos = strstr(line, searchKey);
  if (!pos) return false;
  
  pos += strlen(searchKey);
  size_t idx = 0;
  while (*pos && *pos != ',' && *pos != '\r' && *pos != '\n' && idx < (maxLen - 1)) {
    output[idx++] = *pos++;
  }
  output[idx] = '\0';
  return true;
}

// ==============================================================================
// VERIFICACIONES DE SEGURIDAD FÍSICA
// ==============================================================================
bool checkSafetySensors(char* faultReason, size_t maxReasonLen) {
  // Paro de emergencia presionado (asumiendo botón con INPUT_PULLUP a GND, HIGH = activado/abierto)
  if (digitalRead(PIN_EMERGENCY_STOP) == HIGH) {
    snprintf(faultReason, maxReasonLen, "Paro_de_emergencia_activado");
    return false;
  }
  // Final de carrera alcanzado
  if (digitalRead(PIN_LIMIT_TOP) == HIGH) {
    snprintf(faultReason, maxReasonLen, "Final_de_carrera_superior");
    return false;
  }
  if (digitalRead(PIN_LIMIT_BOTTOM) == HIGH) {
    snprintf(faultReason, maxReasonLen, "Final_de_carrera_inferior");
    return false;
  }
  // Sobrecarga de fuerza
  if (currentForceN > MAX_FORCE_LIMIT_N) {
    snprintf(faultReason, maxReasonLen, "Sobrecarga_fuerza_excede_100N");
    return false;
  }
  return true;
}

void triggerEmergencyStop(const char* reason) {
  digitalWrite(PIN_ENABLE, HIGH); // Desactivar driver motor
  currentState = STATE_FAULT;
  Serial.print("EVENT,type=FAULT,detail=");
  Serial.println(reason);
}

// ==============================================================================
// TRANSMISIÓN DE MUESTRAS AL NAVEGADOR (SAMPLE)
// ==============================================================================
void sendSample(unsigned long t_ms, long raw_force, long raw_disp, float force_n, float disp_mm) {
  char baseBuffer[140];
  
  // 1. Construir la trama base antes del CRC
  // Formato: SAMPLE,seq=...,t_ms=...,force_raw=...,displacement_raw=...,force_n=...,displacement_mm=...
  snprintf(
    baseBuffer, 
    sizeof(baseBuffer),
    "SAMPLE,seq=%lu,t_ms=%lu,force_raw=%ld,displacement_raw=%ld,force_n=%.2f,displacement_mm=%.3f",
    sampleSequence++,
    t_ms,
    raw_force,
    raw_disp,
    force_n,
    disp_mm
  );

  // 2. Calcular CRC-16 sobre todo el texto previo a ",crc="
  uint16_t crc = calculateCrc16Ccitt(baseBuffer, strlen(baseBuffer));

  // 3. Imprimir la trama completa por el puerto serie
  Serial.print(baseBuffer);
  Serial.print(",crc=");
  if (crc < 0x1000) Serial.print("0");
  if (crc < 0x0100) Serial.print("0");
  if (crc < 0x0010) Serial.print("0");
  Serial.println(crc, HEX);
}

// ==============================================================================
// PROCESAMIENTO DE COMANDOS DEL PROTOCOLO SERIAL
// ==============================================================================
void processCommand(const char* line) {
  if (strncmp(line, "CMD,", 4) != 0) return;

  char cmdId[40] = "";
  char cmdType[24] = "";
  
  if (!getParamValue(line, "id", cmdId, sizeof(cmdId))) return;
  if (!getParamValue(line, "type", cmdType, sizeof(cmdType))) return;

  char safetyReason[48];

  // COMANDO: HELLO (Handshake inicial al seleccionar puerto COM en el navegador)
  if (strcmp(cmdType, "HELLO") == 0) {
    currentState = STATE_READY;
    Serial.print("ACK,id=");
    Serial.print(cmdId);
    Serial.println(",status=OK");
    return;
  }

  // COMANDO: ARM_TEST (Prepara el ensayo y valida el perfil de calibración)
  if (strcmp(cmdType, "ARM_TEST") == 0) {
    if (!checkSafetySensors(safetyReason, sizeof(safetyReason))) {
      Serial.print("ACK,id=");
      Serial.print(cmdId);
      Serial.print(",status=ERROR,reason=");
      Serial.println(safetyReason);
      return;
    }

    getParamValue(line, "calibration_profile", lastCalibrationProfile, sizeof(lastCalibrationProfile));
    currentState = STATE_ARMED;
    sampleSequence = 0;
    currentDisplacementMm = 0.0;
    currentForceN = 0.0;

    Serial.print("ACK,id=");
    Serial.print(cmdId);
    Serial.println(",status=OK");
    return;
  }

  // COMANDO: START_TEST (Inicia el ensayo y el movimiento del motor)
  if (strcmp(cmdType, "START_TEST") == 0) {
    if (currentState != STATE_ARMED && currentState != STATE_STOPPED) {
      Serial.print("ACK,id=");
      Serial.print(cmdId);
      Serial.println(",status=ERROR,reason=Maquina_no_esta_armada");
      return;
    }

    if (!checkSafetySensors(safetyReason, sizeof(safetyReason))) {
      Serial.print("ACK,id=");
      Serial.print(cmdId);
      Serial.print(",status=ERROR,reason=");
      Serial.println(safetyReason);
      return;
    }

    digitalWrite(PIN_ENABLE, LOW); // Activar driver motor
    digitalWrite(PIN_DIR, HIGH);   // Sentido tracción
    testStartMillis = millis();
    lastSampleMillis = testStartMillis;
    currentState = STATE_RUNNING;

    Serial.print("ACK,id=");
    Serial.print(cmdId);
    Serial.println(",status=OK");
    return;
  }

  // COMANDO: STOP_TEST (Parada de ensayo solicitada por el operador)
  if (strcmp(cmdType, "STOP_TEST") == 0) {
    digitalWrite(PIN_ENABLE, HIGH); // Apagar motor
    currentState = STATE_STOPPED;

    Serial.print("ACK,id=");
    Serial.print(cmdId);
    Serial.println(",status=OK");
    Serial.println("EVENT,type=TEST_FINISHED");
    return;
  }

  // Comando desconocido
  Serial.print("ACK,id=");
  Serial.print(cmdId);
  Serial.println(",status=ERROR,reason=Comando_no_reconocido");
}

// ==============================================================================
// CONFIGURACIÓN INICIAL (SETUP)
// ==============================================================================
void setup() {
  // Configuración de pines de seguridad con pull-up interno
  pinMode(PIN_EMERGENCY_STOP, INPUT_PULLUP);
  pinMode(PIN_LIMIT_TOP, INPUT_PULLUP);
  pinMode(PIN_LIMIT_BOTTOM, INPUT_PULLUP);

  // Configuración de pines de motor
  pinMode(PIN_STEP, OUTPUT);
  pinMode(PIN_DIR, OUTPUT);
  pinMode(PIN_ENABLE, OUTPUT);
  digitalWrite(PIN_ENABLE, HIGH); // Motor deshabilitado al inicio por seguridad

  // Velocidad recomendada para instrumentación en tiempo real
  Serial.begin(115200);
  while (!Serial) { ; } // Esperar conexión serie
}

// ==============================================================================
// BUCLE PRINCIPAL (LOOP)
// ==============================================================================
void loop() {
  // 1. LECTURA DE COMANDOS PROCEDENTES DE LA PLATAFORMA WEB
  while (Serial.available() > 0) {
    char c = (char)Serial.read();
    if (c == '\n') {
      rxBuffer[rxIndex] = '\0';
      if (rxIndex > 0) {
        processCommand(rxBuffer);
      }
      rxIndex = 0;
    } else if (c != '\r') {
      if (rxIndex < (int)(sizeof(rxBuffer) - 1)) {
        rxBuffer[rxIndex++] = c;
      }
    }
  }

  // 2. MONITOREO CONTINUO DE SEGURIDAD EN CUALQUIER ESTADO
  char safetyReason[48];
  if (currentState == STATE_RUNNING || currentState == STATE_ARMED) {
    if (!checkSafetySensors(safetyReason, sizeof(safetyReason))) {
      triggerEmergencyStop(safetyReason);
    }
  }

  // 3. EJECUCIÓN DURANTE EL ENSAYO (STATE_RUNNING)
  if (currentState == STATE_RUNNING) {
    unsigned long now = millis();

    // Generar pulsos de paso para el motor (Ejemplo simple de tracción continua)
    // En una integración real se usa AccelStepper o interrupción por timer
    digitalWrite(PIN_STEP, HIGH);
    delayMicroseconds(400);
    digitalWrite(PIN_STEP, LOW);
    delayMicroseconds(400);
    rawDisplacementSteps++;

    // Enviar muestras al navegador según el intervalo programado
    if (now - lastSampleMillis >= SAMPLE_INTERVAL_MS) {
      lastSampleMillis = now;
      unsigned long elapsed = now - testStartMillis;

      /*
       * ===================================================================
       * INTEGRACIÓN DE SENSORES REALES:
       * - Para la celda de carga: rawForceAdc = scale.read();
       *                           currentForceN = scale.get_units(1) * 9.80665;
       * - Para el desplazamiento: currentDisplacementMm = rawDisplacementSteps * mm_por_paso;
       * ===================================================================
       */
      // Simulación de respuesta elastoplástica para pruebas en mesa si aún no hay probeta:
      currentDisplacementMm = (float)elapsed * 0.0015; // 1.5 mm/s
      currentForceN = currentDisplacementMm * 14.5;    // Curva de tracción de prueba
      rawForceAdc = (long)(currentForceN * 820.0);

      sendSample(
        elapsed,
        rawForceAdc,
        rawDisplacementSteps,
        currentForceN,
        currentDisplacementMm
      );

      // Simular final de ensayo si se alcanza la deformación límite
      if (currentDisplacementMm >= 12.0) {
        digitalWrite(PIN_ENABLE, HIGH);
        currentState = STATE_STOPPED;
        Serial.println("EVENT,type=TEST_FINISHED");
      }
    }
  }
}
