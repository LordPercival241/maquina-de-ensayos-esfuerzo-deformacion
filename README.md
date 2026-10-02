# UTM Lab — Máquina Universal de Ensayos de Fuerza de Bajo Costo

> Sistema de instrumentación, adquisición de datos en tiempo real y caracterización mecánica de materiales (hasta 100 N) desarrollado con microcontrolador Arduino, celda de carga de 10 kg, accionamiento NEMA 17 y plataforma web moderna en Next.js / Supabase / Vercel.

---

## 1. Introducción y Contexto

La **ciencia de materiales** estudia las propiedades mecánicas, físicas y químicas de los materiales para comprender su comportamiento bajo cargas externas y fundamentar aplicaciones tecnológicas. Entre las propiedades de mayor interés se encuentran la resistencia a la tracción, la deformación elástica/plástica y el módulo de Young.

Las **máquinas universales de ensayos (UTM)** industriales convencionales son equipos voluminosos, de costo elevado (miles de dólares) y con características excesivas para laboratorios de docencia o caracterización de probetas poliméricas a pequeña escala.

Ante esta necesidad, el proyecto propone el **diseño, construcción y validación de una máquina universal de ensayos de fuerza de bajo costo y dimensiones reducidas**, integrando componentes comerciales accesibles, acondicionamiento de señales de precisión, microcontrolador local y una aplicación web moderna para adquisición serial directa en el navegador, graficado en vivo y persistencia trazable en la nube.

---

## 2. Objetivos

### Objetivo Principal
**Diseñar, construir y validar un prototipo de máquina universal de ensayos de fuerza de bajo costo**, capaz de aplicar una fuerza controlada (con límite de seguridad de 100 N) y registrar la respuesta mecánica de probetas poliméricas.

### Objetivos Específicos
* **Estructura mecánica:** Diseñar y fabricar la estructura física, guías lineales y mordazas de sujeción para probetas.
* **Sistema de accionamiento:** Implementar el control de desplazamiento mediante un motor paso a paso NEMA 17 y su etapa de potencia.
* **Instrumentación y acondicionamiento:** Integrar y calibrar una celda de carga de 10 kg (~100 N) con conversor ADC de alta resolución (HX711 o similar).
* **Plataforma de software:** Desarrollar una interfaz web (UTM Lab) con Web Serial API, visualización en tiempo real y asistencia inteligente.
* **Curvas esfuerzo–deformación:** Calcular en tiempo real $\sigma$ (esfuerzo) y $\varepsilon$ (deformación) a partir de los datos geométricos de la probeta y las lecturas calibradas.
* **Evaluación experimental:** Evaluar la resolución, repetibilidad y respuesta del prototipo con diferentes muestras poliméricas comerciales e impresas en 3D.

---

## 3. Integrantes y Responsabilidades

| Integrante | Rol / Especialidad | Responsabilidades Principales |
| :--- | :--- | :--- |
| **Dante Aliguere Olivas Huaman** | **Software y Plataforma Web** | Arquitectura del software, interfaz gráfica en Next.js, adquisición serial v1 con Web Serial API, validación CRC-16, persistencia en Supabase, agente de IA de asistencia y despliegue en Vercel. |
| **Jhosep A. Tineo Santa Cruz** | **Instrumentación y Sensores** | Acondicionamiento de señal para celda de carga de 10 kg, etapa de amplificación/digitalización, integración con Arduino, calibración metrológica y evaluación de estabilidad. |
| **Juan Jesus Agüero Ventura** | **Estructura Mecánica** | Modelado CAD 3D de la máquina, diseño y fabricación de pinzas de sujeción (mordazas), cálculo de tolerancias, soporte de guías y rigidez estructural. |
| **Andre Edmundo Sanchez Marquina** | **Potencia y Accionamiento** | Selección del motor paso a paso NEMA 17, driver de potencia, dimensionamiento eléctrico, fuente de alimentación y control de velocidad/torque del actuador. |

---

## 4. Arquitectura del Sistema

El sistema opera bajo un modelo desacoplado: **el firmware local garantiza la seguridad física y la temporización crítica**, mientras que **el navegador web visualiza, audita y almacena los datos**.

<p align="center">
  <img src="Imagenes/grafico_flujo.png" alt="Diagrama de flujo del sistema" width="620">
</p>

```text
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                 CAPA DE CONTROL LOCAL                                  │
│                                                                                        │
│   [ Celda de Carga 10 kg ] ──> [ ADC / Acondicionamiento ]                             │
│                                           │                                            │
│   [ Finales de carrera / Paro ] ────────> [ Microcontrolador Arduino ]                 │
│                                           │ (Uno / Nano - ATmega328P)                  │
│   [ Driver de potencia ] <────────────────┘                                            │
│            │                                                                           │
│   [ Motor NEMA 17 + Tornillo ] ──> [ Desplazamiento mecánico ]                         │
└───────────────────────────────────────────┬────────────────────────────────────────────┘
                                            │ Cable USB (Protocolo Serial v1 con CRC-16)
                                            ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                              CAPA DE SOFTWARE (UTM LAB)                                │
│                                                                                        │
│   Navegador del Operador (Chrome / Edge)                                               │
│   ├── Web Serial API (Lectura bidireccional local, detección de saltos de seq)         │
│   ├── Motor de cálculo en vivo (Esfuerzo en MPa, Deformación de ingeniería)            │
│   ├── Interfaz gráfica React 19 / Recharts (Curva sin datos sintéticos)                │
│   └── Asistente de Operación flotante (Chat con contexto de pantalla y estado)         │
│                                                                                        │
│   Servicios en la Nube                                                                 │
│   ├── Vercel (Alojamiento Edge/Serverless con HTTPS obligatorio)                       │
│   ├── Supabase Auth (Acceso seguro por correo y contraseña de operadores)              │
│   ├── Supabase PostgreSQL + RLS (Metadatos de probetas y trazabilidad)                 │
│   ├── Supabase Storage (Bucket privado 'test-data' para almacenamiento de CSV)         │
│   └── OpenAI API (Respuestas contextualizadas para el agente de soporte técnico)       │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 5. Plataforma de Software (UTM Lab)

La aplicación web ha sido construida con los más altos estándares modernos de desarrollo:

* **Framework:** [Next.js 15](https://nextjs.org/) con React 19 y TypeScript en App Router.
* **Adquisición Serial:** [Web Serial API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Serial_API) en el cliente. Permite seleccionar puertos COM directamente desde el diálogo nativo del navegador, sin servidores intermediarios ni dependencias locales pesadas.
* **Autenticación y Seguridad:** [Supabase Auth](https://supabase.com/) con **correo y contraseña (Email/Password)**. Toda la base de datos y los archivos CSV están protegidos por políticas **Row Level Security (RLS)** vinculadas al `auth.uid()`.
* **Visualización:** [Recharts](https://recharts.org/) configurado para trazado en tiempo real. **No se admiten datos de demostración**: la curva solo se grafica a partir de muestras reales confirmadas por el hardware.
* **Agente de IA Integrado:** Ruta API Serverless en `/api/assistant` conectada a OpenAI Responses API. Proporciona asistencia de diagnóstico al operador con lectura del estado actual de la máquina (`ready`, `running`, `fault`), sin capacidad de intervenir directamente en el control físico por razones de seguridad.

---

## 6. Protocolo Serial v1 (Hardware ↔ Software)

La comunicación entre el microcontrolador y la aplicación web se realiza a través de tramas de texto estructuradas con confirmación y suma de verificación.

### 6.1. Comandos de Control (Handshake)

Todas las órdenes enviadas por la interfaz web llevan un identificador UUID único. El firmware debe responder con un mensaje `ACK`:

```text
// 1. Handshake inicial
CMD,id=<uuid>,type=HELLO
ACK,id=<uuid>,status=OK

// 2. Armado de ensayo (con perfil de calibración validado)
CMD,id=<uuid>,type=ARM_TEST,calibration_profile=<perfil_id>
ACK,id=<uuid>,status=OK

// 3. Inicio del desplazamiento y muestreo
CMD,id=<uuid>,type=START_TEST
ACK,id=<uuid>,status=OK

// 4. Parada de ensayo
CMD,id=<uuid>,type=STOP_TEST
ACK,id=<uuid>,status=OK
```

Si el firmware detecta una condición insegura (paro presionado, sobrecarga, calibración ausente), puede rechazar la orden:
```text
ACK,id=<uuid>,status=ERROR,reason=Paro_de_emergencia_activado
```

### 6.2. Tramas de Muestras (`SAMPLE`)

Cada punto de ensayo se transmite en una sola línea terminada en `\n`:

```text
SAMPLE,seq=42,t_ms=1200,force_raw=4567,displacement_raw=123,force_n=101.22,displacement_mm=0.42,crc=ABCD
```

* `seq`: Secuencia incremental entera (permite detectar pérdidas de muestras si hay saltos).
* `t_ms`: Tiempo de ejecución en milisegundos generado por el timer del microcontrolador.
* `force_raw` / `displacement_raw`: Lecturas crudas del ADC/encoder para fines de auditoría.
* `force_n`: Fuerza física calculada y calibrada en Newtons (N).
* `displacement_mm`: Desplazamiento medido en milímetros (mm).
* `crc`: Checksum **CRC-16/CCITT** en formato hexadecimal de 4 dígitos, calculado sobre todo el texto previo a `,crc=`.

> [!IMPORTANT]
> Las muestras recibidas con CRC inválido son descartadas de inmediato. Si se detecta un salto de secuencia (por ejemplo, de `seq=10` a `seq=14`), la interfaz registra 3 muestras perdidas y lo consigna en el encabezado del archivo CSV final.

### 6.3. Eventos Asíncronos de Seguridad (`EVENT`)

El firmware puede notificar eventos críticos de inmediato:
```text
EVENT,type=OVERLOAD,detail=Fuerza_excede_100N
EVENT,type=LIMIT_REACHED,detail=Final_de_carrera_superior
EVENT,type=FAULT,detail=Error_lectura_celda
EVENT,type=TEST_FINISHED
```

---

## 7. Modelo Matemático de Ensayos

A partir de la geometría inicial ingresada por el operador y los valores calibrados transmitidos por el microcontrolador:

$$\sigma = \frac{F}{A_0} \quad [\text{MPa}]$$

$$\varepsilon = \frac{\Delta L}{L_0} \quad [\text{adimensional}]$$

* **$F$:** Fuerza calibrada medida por la celda de carga en Newtons ($N$).
* **$A_0$:** Área transversal inicial de la sección calibrada de la probeta en $\text{mm}^2$.
* **$\Delta L$:** Desplazamiento medido en $\text{mm}$.
* **$L_0$:** Longitud de referencia inicial de la probeta en $\text{mm}$.
* **$\sigma$:** Esfuerzo de ingeniería en megapascales ($1\,\text{N/mm}^2 = 1\,\text{MPa}$).
* **$\varepsilon$:** Deformación unitaria (la interfaz la muestra expresada en porcentaje $\%$).

> [!NOTE]
> El desplazamiento del travesaño o motor paso a paso refleja la elongación de la probeta únicamente si la estructura mecánica posee rigidez adecuada o si se utiliza un extensómetro. En caso contrario, los resultados deben interpretarse como esfuerzo frente a desplazamiento de cabezal.

---

## 8. Puesta en Marcha Local

### 8.1. Requisitos Previos
* **Node.js:** Versión 20.x o superior.
* **Navegador:** Google Chrome o Microsoft Edge para soporte nativo de Web Serial API.
* **Supabase:** Cuenta gratuita o local con proyecto creado.
* **OpenAI (Opcional):** Clave de API para el agente de consulta técnica.

### 8.2. Instalación y Configuración

1. Clonar el repositorio e instalar las dependencias:
   ```bash
   git clone https://github.com/LordPercival241/maquina-de-ensayos-esfuerzo-deformacion.git
   cd "UTM - Proyecto de Instrumentación"
   npm install
   ```

2. Crear el archivo de variables de entorno locales:
   ```powershell
   Copy-Item .env.example .env.local
   ```

3. Completar las variables en `.env.local`:
   ```dotenv
   # Variables públicas de Supabase
   NEXT_PUBLIC_SUPABASE_URL=https://<tu-proyecto>.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<tu-anon-key>

   # Variables privadas de servidor (OpenAI)
   OPENAI_API_KEY=sk-...
   OPENAI_MODEL=gpt-4o-mini
   ```

4. Configurar la base de datos en Supabase:
   * Abra el **SQL Editor** de su proyecto en Supabase.
   * Ejecute la migración [supabase/migrations/202609180001_initial.sql](supabase/migrations/202609180001_initial.sql).
   * Verifique en **Authentication → Providers** que **Email** esté habilitado.

5. Iniciar el servidor de desarrollo:
   ```bash
   npm run dev
   ```
   Abra `http://localhost:3000` en Chrome o Edge.

### 8.3. Scripts Disponibles

```bash
npm run dev        # Servidor de desarrollo con Turbopack
npm run build      # Compilación optimizada de producción
npm run start      # Servidor en modo producción
npm run lint       # Análisis estático de código con ESLint
npm run typecheck  # Verificación estricta de tipos TypeScript
```

---

## 9. Despliegue en Producción (Vercel)

El proyecto está completamente preparado para desplegarse en **Vercel**:

1. Suba su rama a GitHub y vincule el repositorio en el panel de [Vercel](https://vercel.com).
2. En **Settings → Environment Variables** del proyecto en Vercel, agregue:
   * `NEXT_PUBLIC_SUPABASE_URL`
   * `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   * `OPENAI_API_KEY`
   * `OPENAI_MODEL`
3. En **Supabase → Authentication → URL Configuration**, añada su dominio de Vercel (`https://<proyecto>.vercel.app`) en *Site URL* y en *Redirect URLs*.
4. Realice el despliegue.

> [!TIP]
> **Compatibilidad HTTPS y Web Serial en Vercel:**
> La Web Serial API exige de forma obligatoria un contexto seguro (HTTPS). Al desplegar en Vercel, el dominio obtiene un certificado SSL automático y el archivo `next.config.ts` ya contiene la cabecera `Permissions-Policy: serial=(self)` requerida para que el navegador autorice el acceso al puerto USB.

---

## 10. Estado del Proyecto y Hoja de Ruta

- [x] Definición conceptual y parámetros de diseño (límite 100 N).
- [x] Distribución de responsabilidades entre los cuatro integrantes.
- [x] Adquisición de componentes clave (Arduino, celda 10 kg, motor NEMA 17, driver).
- [x] Desarrollo de la plataforma web en Next.js con soporte Web Serial, Recharts y OpenAI.
- [x] Migración de autenticación a Supabase Email/Password con RLS y Storage privado.
- [x] Validación de compilación y preparación para despliegue en Vercel.
- [ ] Implementación del firmware en Arduino con cálculo de CRC-16/CCITT y timeouts de seguridad.
- [ ] Calibración experimental con masas patrón de la celda de carga de 10 kg.
- [ ] Fabricación de piezas CAD definitivas (mordazas y soportes de guías).
- [ ] Ensayos con muestras de polímeros (PLA, PETG, ABS) y trazado experimental de curvas.

---

## 11. Documentación Complementaria

* [Guía de puesta en marcha rápida](docs/SETUP.md)
* [Migración inicial de base de datos](supabase/migrations/202609180001_initial.sql)
* [Documento de Estado del Arte](Estado%20del%20arte_Olivas_Tineo_Ag%C3%BAero_%20Sanchez.pdf)
