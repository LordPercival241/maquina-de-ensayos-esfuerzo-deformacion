# Máquina Universal de Ensayos de Fuerza de Bajo Costo

## Introducción

La **ciencia de materiales** estudia las propiedades físicas y químicas de los materiales con el objetivo de comprender su comportamiento y desarrollar aplicaciones tecnológicas. Entre las propiedades mecánicas de interés se encuentran la resistencia a la tracción, la deformación y el módulo de Young.

Para determinar estas propiedades, normalmente se utilizan **máquinas universales de ensayos**, las cuales permiten aplicar fuerzas controladas sobre una muestra y registrar su respuesta mecánica. Sin embargo, estos equipos suelen presentar un costo elevado, grandes dimensiones y características que pueden resultar innecesarias cuando se trabaja con muestras pequeñas o cuando se busca realizar ensayos específicos.

Ante esta problemática, se propone el **diseño y construcción de una máquina universal de ensayos de fuerza de bajo costo y dimensiones reducidas**, empleando componentes comerciales y sistemas de adquisición de datos de fácil acceso. El prototipo estará orientado principalmente al ensayo de muestras de polímeros y permitirá obtener información relacionada con la fuerza aplicada y la elongación de la muestra.

El proyecto integra las áreas de **software, instrumentación electrónica, mecánica y potencia**, buscando desarrollar un sistema funcional que permita realizar ensayos mecánicos de manera accesible.

## Estado del arte

El estado del arte y los antecedentes relacionados con el proyecto se encuentran disponibles en los archivos incluidos en este repositorio.

---

# Objetivos

## Objetivo principal

**Diseñar, construir y validar un prototipo de máquina universal de ensayos de fuerza de bajo costo**, capaz de aplicar una fuerza controlada y registrar la respuesta mecánica de diferentes muestras.

## Objetivos específicos

* Diseñar y construir la estructura mecánica del prototipo.
* Implementar el sistema de accionamiento mediante un motor paso a paso.
* Implementar y validar el sistema de acondicionamiento y adquisición de señales de una celda de carga de 10 kg.
* Desarrollar un sistema de adquisición y visualización de datos mediante Arduino y software de procesamiento.
* Obtener las curvas de **esfuerzo-deformación** a partir de los datos registrados.
* Evaluar la respuesta del prototipo utilizando diferentes muestras de polímeros.
* Determinar experimentalmente parámetros como la fuerza aplicada, elongación y, cuando las dimensiones de la muestra sean conocidas, el esfuerzo y la deformación.
* Evaluar la resolución y repetibilidad del prototipo.

---

# Integrantes y responsabilidades

## Dante Aliguere Olivas Huaman

### Etapa de software

Encargado del desarrollo del software para la adquisición, procesamiento y visualización de los datos obtenidos por el prototipo.

Entre sus principales funciones se encuentran:

* Desarrollar el sistema de lectura de datos.
* Procesar los datos obtenidos durante el ensayo.
* Generar las gráficas de **esfuerzo vs. deformación**.
* Implementar las herramientas necesarias para visualizar y almacenar los resultados experimentales.

El desarrollo del software se encuentra parcialmente avanzado y está disponible en este repositorio.

---

## Jhosep A. Tineo Santa Cruz

### Etapa de instrumentación

Encargado del sistema de medición de fuerza mediante una **celda de carga de 10 kg**.

Sus principales funciones son:

* Implementar el acondicionamiento de la señal de la celda de carga.
* Integrar la celda de carga con el sistema de adquisición de datos.
* Verificar el correcto funcionamiento del sistema de medición.
* Realizar posteriormente la calibración de la celda de carga.
* Evaluar la respuesta y estabilidad del sistema de medición.

Actualmente se cuenta con los componentes necesarios y se encuentra en proceso la verificación de su correcto funcionamiento antes de realizar la calibración.

---

## Juan Jesus Agüero Ventura

### Etapa mecánica

Encargado del diseño y desarrollo de la estructura mecánica del prototipo.

Sus principales funciones son:

* Desarrollar el modelo CAD de la máquina.
* Diseñar las pinzas de sujeción de las muestras.
* Diseñar la base y los soportes para los diferentes componentes.
* Determinar las dimensiones y características mecánicas necesarias para el funcionamiento del prototipo.
* Realizar cálculos relacionados con la resolución y desplazamiento del sistema.

Los avances realizados hasta el momento incluyen la modificación de modelos existentes y funcionales para adaptarlos a las especificaciones del proyecto. En caso de ser necesario, se desarrollarán nuevas piezas específicamente para el prototipo.

---

## Andre Edmundo Sanchez Marquina

### Etapa de potencia y accionamiento

Encargado del sistema de potencia y del accionamiento mecánico mediante un **motor paso a paso NEMA 17**.

Sus principales funciones son:

* Seleccionar y poner en funcionamiento el motor paso a paso.
* Determinar los requerimientos de corriente y tensión del sistema.
* Realizar los cálculos de consumo energético.
* Seleccionar una fuente de alimentación adecuada.
* Implementar el sistema de potencia necesario para el accionamiento del prototipo.

El motor paso a paso será el elemento encargado de proporcionar el movimiento necesario para aplicar la fuerza y producir el desplazamiento durante el ensayo.

---

# Integración del proyecto

Aunque cada integrante posee una responsabilidad principal, el desarrollo del prototipo requiere la integración de todas las etapas.

Los integrantes mantendrán comunicación constante para compartir parámetros, dimensiones, requerimientos eléctricos, datos experimentales y demás variables necesarias para garantizar la compatibilidad entre los diferentes subsistemas.

 

# Electrónica y control

**Se ha decidido utilizar un** **Arduino Uno como microcontrolador principal del proyecto**.

 

# Estado actual del proyecto

Los principales avances realizados hasta el momento son:

* [x] Definición general del proyecto.
* [x] Distribución de responsabilidades entre los integrantes.
* [x] Selección inicial de Arduino Uno como microcontrolador.
* [x] Adquisición de la celda de carga de 10 kg.
* [x] Adquisición de los componentes principales.
* [x] Desarrollo inicial del software.
* [ ] Validación del acondicionamiento de la celda de carga.
* [ ] Calibración del sistema de medición.
* [ ] Diseño mecánico definitivo.
* [ ] Implementación del sistema de accionamiento.
* [ ] Integración de los subsistemas.
* [ ] Pruebas con muestras de polímeros.
* [ ] Obtención y análisis de curvas esfuerzo-deformación.
* [ ] Validación final del prototipo.

# &#x20;



![Diagrama de Flujo] Imagenes/grafico_flujo.png
<p align="center">
  <img src="Imagenes/grafico_flujo.png" width="600">
</p>












 

#Software


# UTM Lab — Máquina universal de ensayos de fuerza low cost

UTM Lab es una plataforma web para operar, adquirir y conservar datos de ensayos uniaxiales de fuerza. Está pensada para desplegarse en Vercel y conectarse, desde el navegador del operador, a un controlador local —inicialmente un Arduino Nano— mediante cable USB/serial.

La plataforma no inventa datos de medición: las curvas sólo se dibujan a partir de muestras válidas recibidas del controlador y conservadas en CSV.

## Alcance actual

- Inicio de sesión con Google OAuth mediante Supabase.
- Dashboard de operación protegido por sesión.
- Selección explícita de puerto COM usando Web Serial API.
- Handshake serial, confirmación de comandos (`ACK`), estado de conexión y gestión de fallos.
- Preparación de ensayo con ID de probeta, material, longitud inicial, área inicial y perfil de calibración.
- Cálculo de esfuerzo y deformación de ingeniería a partir de las mediciones recibidas.
- Curva esfuerzo–deformación en vivo, sin datos de muestra.
- Verificación CRC-16/CCITT y detección de secuencias de muestras perdidas.
- Descarga de CSV y persistencia privada de ensayos en Supabase Storage.
- Asistente de ayuda flotante, autenticado y sin permisos para controlar el equipo.

## Arquitectura

```text
Operador (Chrome/Edge) ── Web Serial/USB ── Controlador local ── Sensores y actuadores
         │
         ├── Next.js en Vercel
         ├── Supabase Auth + PostgreSQL + Storage
         └── API de ayuda (servidor) ── OpenAI Responses API
```

El navegador visualiza datos y solicita acciones; no es un controlador en tiempo real. La seguridad del movimiento debe residir en el firmware y hardware local: paro de emergencia, límites mecánicos, límite de fuerza, detección de sensor inválido y pérdida de comunicación.

## Requisitos

- Node.js 20 o superior.
- Cuenta/proyecto de Supabase.
- Credenciales OAuth de Google configuradas en Supabase.
- Una clave de OpenAI y un modelo configurado, sólo si se desea habilitar el asistente.
- Chrome o Edge de escritorio para usar Web Serial. El usuario debe seleccionar el puerto desde el diálogo nativo del navegador.

## Instalación local

```bash
npm install
Copy-Item .env.example .env.local
npm run dev
```

Abra `http://localhost:3000`.

## Configuración de variables

Complete `.env.local` sin publicar sus secretos:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://<proyecto>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>

# Sólo servidor; nunca usar el prefijo NEXT_PUBLIC_
OPENAI_API_KEY=<api-key>
OPENAI_MODEL=<modelo-aprobado>
```

En Supabase, active el proveedor Google y registre estas URL de retorno:

```text
http://localhost:3000/auth/callback
https://<dominio-vercel>/auth/callback
```

## Base de datos y almacenamiento

Ejecute la migración [`supabase/migrations/202609180001_initial.sql`](supabase/migrations/202609180001_initial.sql) en el editor SQL de Supabase. Esta crea:

- La tabla `test_runs` con metadatos de probeta, geometría, calibración, cantidad de muestras y CSV asociado.
- El bucket privado `test-data`.
- Políticas Row Level Security para que cada persona sólo vea y cargue sus propios ensayos y archivos.

## Protocolo serial v1

El firmware debe implementar el protocolo antes de conectarse a una máquina. Todas las órdenes usan un identificador único y requieren respuesta:

```text
CMD,id=<uuid>,type=HELLO
ACK,id=<uuid>,status=OK

CMD,id=<uuid>,type=ARM_TEST,calibration_profile=<perfil>
ACK,id=<uuid>,status=OK

CMD,id=<uuid>,type=START_TEST
ACK,id=<uuid>,status=OK

CMD,id=<uuid>,type=STOP_TEST
ACK,id=<uuid>,status=OK
```

El controlador puede rechazar cualquier orden que no sea segura:

```text
ACK,id=<uuid>,status=ERROR,reason=<causa>
```

### Muestras

Cada muestra debe enviarse en una sola línea y llevar CRC-16/CCITT hexadecimal. El CRC se calcula sobre todo el texto anterior a `,crc=`.

```text
SAMPLE,seq=42,t_ms=1200,force_raw=4567,displacement_raw=123,force_n=101.22,displacement_mm=0.42,crc=ABCD
```

- `seq`: número de secuencia creciente.
- `t_ms`: tiempo del controlador, no del navegador.
- `force_raw` y `displacement_raw`: lecturas crudas para trazabilidad.
- `force_n` y `displacement_mm`: valores calibrados por el controlador.

Una muestra con CRC inválido se descarta; un salto de secuencia queda reportado en pantalla y en el CSV final.

## Modelo matemático

Para esfuerzo y deformación de ingeniería:

```text
σ = F / A₀
ε = ΔL / L₀
```

- `F`: fuerza calibrada, en N.
- `A₀`: área transversal inicial, en mm².
- `ΔL`: elongación medida, en mm.
- `L₀`: longitud inicial de referencia, en mm.
- `σ`: esfuerzo en MPa, ya que 1 N/mm² equivale a 1 MPa.
- `ε`: deformación adimensional; la interfaz la presenta en porcentaje.

El desplazamiento de un travesaño no equivale automáticamente a elongación de la probeta. Para reportar una curva esfuerzo–deformación válida se necesita un extensómetro o una corrección de complianza validada. De lo contrario, la gráfica debe identificarse como esfuerzo frente a desplazamiento de cabezal.

## Seguridad y validación obligatoria

No conecte ni active actuadores reales hasta completar estas verificaciones:

1. Definir motor, driver, alimentación, pines, sentido de movimiento y aceleración en el firmware.
2. Implementar paro de emergencia físico, finales de carrera y corte por sobrecarga independientes del navegador.
3. Establecer qué ocurre al perder USB, cerrar la pestaña, recibir un comando corrupto o detectar un sensor inválido: el resultado debe ser una parada local segura.
4. Calibrar fuerza y desplazamiento con patrones adecuados, conservando fecha, responsable y versión de cada perfil.
5. Validar comunicación, CRC, pérdida de paquetes y cada condición de parada primero en banco de pruebas.
6. Confirmar que el controlador —no la web— autoriza el armado e inicio del ensayo.

## Scripts

```bash
npm run dev        # Desarrollo local
npm run lint       # Revisión estática
npm run typecheck  # Tipos TypeScript
npm run build      # Compilación de producción
```

## Despliegue en Vercel

1. Suba el repositorio a GitHub/GitLab/Bitbucket y cree un proyecto en Vercel.
2. Configure las mismas variables de `.env.local` en **Settings → Environment Variables**.
3. Añada la URL final de Vercel como redirect URL de Google en Supabase.
4. Despliegue. La conexión COM seguirá ocurriendo en el computador local del operador, no en los servidores de Vercel.

## Próximo desarrollo necesario

La interfaz está preparada para el protocolo, pero el firmware de control no se debe adivinar. El siguiente bloque de trabajo requiere las especificaciones físicas del sistema: modelo de celda de carga y ADC, encoder/extensómetro, motor/driver, pines, rangos, frecuencia de muestreo y lógica de interbloqueos.

