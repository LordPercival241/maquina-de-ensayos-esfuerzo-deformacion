"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Activity, CircleStop, Download, FileText, Loader2, LogOut, Play, Usb } from "lucide-react";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { HelpChat } from "@/components/help-chat";
import { makeTestCsv, downloadCsv } from "@/lib/csv";
import { captureChartAsPng, generateTestPdf } from "@/lib/pdf-report";
import { hasSupabaseConfig, supabase } from "@/lib/supabase";
import { testSetupSchema, type TestSetup } from "@/lib/test-domain";
import { useSerialTestSession } from "@/hooks/use-serial-test-session";

const labels = {
  disconnected: "Desconectada",
  connecting: "Conectando",
  ready: "Lista",
  arming: "Armando",
  running: "En ensayo",
  stopped: "Finalizado",
  fault: "Fallo"
} as const;

const initialSetup = {
  specimenId: "",
  material: "",
  gaugeLengthMm: "",
  areaMm2: "",
  calibrationProfileId: ""
};

export default function DashboardPage() {
  const router = useRouter();
  const serial = useSerialTestSession();
  const [setup, setSetup] = useState(initialSetup);
  const [validatedSetup, setValidatedSetup] = useState<TestSetup | null>(null);
  const [baudRate, setBaudRate] = useState("115200");
  const [userName, setUserName] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [exportingPdf, setExportingPdf] = useState(false);
  const chartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const session = async () => {
      if (!supabase) return router.replace("/");
      const { data } = await supabase.auth.getUser();
      if (!data.user) return router.replace("/");
      setUserName(data.user.user_metadata?.full_name || data.user.email || "Operador");
    };
    void session();
  }, [router]);

  const csv = useMemo(
    () => (validatedSetup ? makeTestCsv(validatedSetup, serial.samples, serial.droppedSamples) : ""),
    [validatedSetup, serial.samples, serial.droppedSamples]
  );

  const validateSetup = () => {
    const parsed = testSetupSchema.safeParse(setup);
    if (!parsed.success) throw new Error(parsed.error.issues[0]?.message || "Revise los datos del ensayo.");
    setValidatedSetup(parsed.data);
    return parsed.data;
  };

  const connect = async () => {
    try {
      await serial.connect(Number(baudRate));
    } catch (caught) {
      setNotice(caught instanceof Error ? caught.message : "No fue posible abrir el puerto.");
    }
  };

  const start = async (event: FormEvent) => {
    event.preventDefault();
    try {
      await serial.start(validateSetup());
      setNotice("El controlador confirmó el inicio del ensayo.");
    } catch (caught) {
      setNotice(caught instanceof Error ? caught.message : "No fue posible iniciar.");
    }
  };

  const stop = async () => {
    try {
      await serial.stop();
    } catch (caught) {
      setNotice(caught instanceof Error ? caught.message : "No fue posible detener.");
    }
  };

  const downloadPdf = async () => {
    if (!validatedSetup || !serial.samples.length) {
      return setNotice("No hay muestras registradas para generar el reporte PDF.");
    }
    setExportingPdf(true);
    try {
      const chartPng = chartRef.current ? await captureChartAsPng(chartRef.current) : null;
      generateTestPdf(validatedSetup, serial.samples, serial.droppedSamples, userName, chartPng);
      setNotice("Reporte PDF con gráfica y estadísticas generado y descargado exitosamente.");
    } catch (caught) {
      setNotice(caught instanceof Error ? caught.message : "No fue posible generar el reporte PDF.");
    } finally {
      setExportingPdf(false);
    }
  };

  const signOut = async () => {
    await supabase?.auth.signOut();
    router.replace("/");
  };

  if (!hasSupabaseConfig) {
    return (
      <main className="centered">
        <p>Configure Supabase antes de usar el panel.</p>
      </main>
    );
  }

  return (
    <main className="dashboard">
      <header className="dashboard-header">
        <div>
          <p className="eyebrow">UTM · sesión de ensayo</p>
          <h1>Panel de operación</h1>
        </div>
        <div className="user-actions">
          <span>{userName}</span>
          <button className="icon-button" onClick={signOut} aria-label="Cerrar sesión" title="Cerrar sesión">
            <LogOut size={18} />
          </button>
        </div>
      </header>

      {notice && <p className="notice" role="status">{notice}</p>}
      {serial.error && <p className="alert" role="alert">{serial.error}</p>}

      <section className="status-row">
        <div className={`machine-status ${serial.status}`}>
          <span />
          {labels[serial.status]}
        </div>
        <p>
          <strong>Controlador:</strong> {serial.lastMessage}
        </p>
      </section>

      <div className="dashboard-grid">
        <section className="card setup-card">
          <div className="section-title">
            <Usb size={18} />
            <h2>Conexión y configuración</h2>
          </div>

          <div className="serial-controls">
            <label>
              Velocidad serial (baud)
              <input
                inputMode="numeric"
                value={baudRate}
                onChange={(event) => setBaudRate(event.target.value)}
                placeholder="Definida por el firmware (ej. 115200)"
              />
            </label>
            {serial.status === "disconnected" ? (
              <button className="button secondary" onClick={connect}>
                <Usb size={17} />
                Seleccionar puerto COM
              </button>
            ) : (
              <button className="button secondary" onClick={() => void serial.disconnect()}>
                Desconectar
              </button>
            )}
          </div>

          <form onSubmit={start} className="setup-form">
            <label>
              ID de probeta
              <input
                required
                value={setup.specimenId}
                onChange={(e) => setSetup({ ...setup, specimenId: e.target.value })}
                placeholder="Ej. PROB-PLA-01"
              />
            </label>
            <label>
              Material
              <input
                required
                value={setup.material}
                onChange={(e) => setSetup({ ...setup, material: e.target.value })}
                placeholder="Ej. PLA 100% relleno"
              />
            </label>
            <label>
              Longitud inicial L₀ (mm)
              <input
                required
                type="number"
                min="0"
                step="any"
                value={setup.gaugeLengthMm}
                onChange={(e) => setSetup({ ...setup, gaugeLengthMm: e.target.value })}
                placeholder="50"
              />
            </label>
            <label>
              Área inicial A₀ (mm²)
              <input
                required
                type="number"
                min="0"
                step="any"
                value={setup.areaMm2}
                onChange={(e) => setSetup({ ...setup, areaMm2: e.target.value })}
                placeholder="16"
              />
            </label>
            <label>
              Perfil de calibración aprobado
              <input
                required
                value={setup.calibrationProfileId}
                onChange={(e) => setSetup({ ...setup, calibrationProfileId: e.target.value })}
                placeholder="CALIB-2026-v1"
              />
            </label>
            <p className="form-note">
              El controlador local debe verificar límites mecánicos, paro de emergencia, sensores y perfil antes de aceptar el armado.
            </p>
            <button
              className="button primary"
              disabled={serial.status !== "ready" && serial.status !== "stopped"}
              type="submit"
            >
              <Play size={17} />
              Armar e iniciar ensayo
            </button>
          </form>

          <button
            className="button danger"
            disabled={serial.status !== "running" && serial.status !== "arming"}
            onClick={stop}
          >
            <CircleStop size={17} />
            Solicitar parada
          </button>
        </section>

        <section className="card chart-card">
          <div className="section-title">
            <Activity size={18} />
            <h2>Curva Esfuerzo–Deformación</h2>
            <span>{serial.samples.length} muestras</span>
          </div>

          {serial.droppedSamples > 0 && (
            <p className="alert">
              Se detectaron {serial.droppedSamples} muestras faltantes por secuencia. Revise la calidad de adquisición serial.
            </p>
          )}

          <div ref={chartRef} style={{ width: "100%", minHeight: "360px" }}>
            {serial.samples.length ? (
              <ResponsiveContainer width="100%" height={360}>
                <LineChart data={serial.samples}>
                  <XAxis
                    dataKey="strain"
                    type="number"
                    tickFormatter={(value) => `${(value * 100).toFixed(1)}%`}
                    label={{ value: "Deformación unitaria (ε)", position: "insideBottom", offset: -5 }}
                  />
                  <YAxis
                    dataKey="stressMpa"
                    label={{ value: "Esfuerzo σ (MPa)", angle: -90, position: "insideLeft" }}
                  />
                  <Tooltip
                    formatter={(value: number) => [`${value.toFixed(3)} MPa`, "Esfuerzo"]}
                    labelFormatter={(label: number) => `Deformación: ${(Number(label) * 100).toFixed(2)}%`}
                  />
                  <Line dataKey="stressMpa" stroke="#7dd3fc" dot={false} isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="empty-chart">
                <Activity size={30} />
                <p>Esperando muestras verificadas del controlador.</p>
                <small>La curva se mostrará cuando lleguen mensajes <code>SAMPLE</code> válidos.</small>
              </div>
            )}
          </div>

          <div className="export-row">
            <button
              className="button secondary"
              disabled={!csv}
              onClick={() => downloadCsv(`ensayo-${validatedSetup?.specimenId || "sin-id"}.csv`, csv)}
              title="Descargar matriz cruda y calculada en CSV"
            >
              <Download size={17} />
              Descargar CSV
            </button>
            <button
              className="button primary"
              disabled={!serial.samples.length || exportingPdf}
              onClick={downloadPdf}
              title="Generar y descargar reporte formal en PDF con gráfica incrustada"
            >
              {exportingPdf ? (
                <>
                  <Loader2 size={17} className="animate-spin" />
                  <span>Generando PDF…</span>
                </>
              ) : (
                <>
                  <FileText size={17} />
                  <span>Descargar Reporte PDF</span>
                </>
              )}
            </button>
          </div>
        </section>
      </div>

      <HelpChat status={serial.status} lastMessage={serial.lastMessage} />
    </main>
  );
}
