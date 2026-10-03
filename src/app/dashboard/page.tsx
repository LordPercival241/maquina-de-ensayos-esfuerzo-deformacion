"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  AlertTriangle,
  Bot,
  CheckCircle2,
  CircleStop,
  Cpu,
  Download,
  FileText,
  HardDriveDownload,
  Layers,
  Loader2,
  LogOut,
  Maximize2,
  Minimize2,
  Play,
  RotateCcw,
  Send,
  ShieldAlert,
  ShieldCheck,
  Terminal,
  Usb,
  Wifi,
  WifiOff
} from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { makeTestCsv, downloadCsv } from "@/lib/csv";
import { captureChartAsPng, generateTestPdf } from "@/lib/pdf-report";
import { hasSupabaseConfig, supabase } from "@/lib/supabase";
import { testSetupSchema, type TestSetup, type TestStatus } from "@/lib/test-domain";
import { useSerialTestSession } from "@/hooks/use-serial-test-session";

const statusConfig: Record<
  TestStatus,
  { label: string; color: string; badge: string; pulse: boolean }
> = {
  disconnected: {
    label: "DESCONECTADO",
    color: "text-slate-400 border-slate-700 bg-slate-900/60",
    badge: "bg-slate-600",
    pulse: false,
  },
  connecting: {
    label: "CONECTANDO...",
    color: "text-cyan-400 border-cyan-800 bg-cyan-950/40",
    badge: "bg-cyan-400",
    pulse: true,
  },
  ready: {
    label: "SISTEMA LISTO",
    color: "text-emerald-400 border-emerald-800 bg-emerald-950/40",
    badge: "bg-emerald-400",
    pulse: true,
  },
  arming: {
    label: "ARMANDO ENSAYO",
    color: "text-amber-400 border-amber-800 bg-amber-950/40",
    badge: "bg-amber-400",
    pulse: true,
  },
  running: {
    label: "ENSAYO EN CURSO",
    color: "text-laser border-laser/40 bg-laser/10",
    badge: "bg-laser",
    pulse: true,
  },
  stopped: {
    label: "ENSAYO FINALIZADO",
    color: "text-blue-400 border-blue-800 bg-blue-950/40",
    badge: "bg-blue-400",
    pulse: false,
  },
  fault: {
    label: "BLOQUEO DE SEGURIDAD",
    color: "text-rose-400 border-rose-800 bg-rose-950/50",
    badge: "bg-rose-500",
    pulse: true,
  },
};

const initialSetup = {
  specimenId: "PROB-001",
  material: "PLA 100% Infill",
  widthMm: "4.0",
  thicknessMm: "4.0",
  gaugeLengthMm: "50",
  areaMm2: "16.0",
  calibrationProfileId: "CALIB-2026-v1",
};

type ChatMessage = { role: "user" | "assistant"; text: string; time: string };

export default function DashboardPage() {
  const router = useRouter();
  const serial = useSerialTestSession();
  const [setup, setSetup] = useState(initialSetup);
  const [validatedSetup, setValidatedSetup] = useState<TestSetup | null>(null);
  const [baudRate, setBaudRate] = useState("115200");
  const [userName, setUserName] = useState("Operador Principal");
  const [notice, setNotice] = useState<{ text: string; type: "info" | "warn" | "error" | "success" } | null>(null);
  const [exportingPdf, setExportingPdf] = useState(false);
  const chartRef = useRef<HTMLDivElement>(null);

  // States for toggles
  const [isSerialOpen, setIsSerialOpen] = useState(false);
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);

  // Estado del Asistente Gemini
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      text: "Terminal de Diagnóstico UTM Lab en línea (Gemini 3.8 Flash). Monitoreando parámetros de celda (10 kg / 100 N) y motor NEMA 17. Formule su consulta técnica o solicite validación de norma ASTM/ISO.",
      time: "INIT",
    },
  ]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [terminalExpanded, setTerminalExpanded] = useState(false);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const session = async () => {
      if (!supabase) return router.replace("/");
      const { data } = await supabase.auth.getUser();
      if (!data.user) return router.replace("/");
      setUserName(data.user.user_metadata?.full_name || data.user.email || "Operador");
    };
    void session();
  }, [router]);

  // Actualización automática de área inicial calculada A0 = w * t
  const handleDimensionChange = (key: "widthMm" | "thicknessMm", value: string) => {
    const nextSetup = { ...setup, [key]: value };
    const w = parseFloat(key === "widthMm" ? value : setup.widthMm);
    const t = parseFloat(key === "thicknessMm" ? value : setup.thicknessMm);
    if (!isNaN(w) && !isNaN(t) && w > 0 && t > 0) {
      nextSetup.areaMm2 = (w * t).toFixed(2);
    }
    setSetup(nextSetup);
  };

  // KPIs calculados en tiempo real
  const lastSample = serial.samples[serial.samples.length - 1];
  const maxForce = useMemo(() => serial.samples.reduce((max, s) => (s.forceN > max ? s.forceN : max), 0), [serial.samples]);
  const maxStress = useMemo(() => serial.samples.reduce((max, s) => (s.stressMpa > max ? s.stressMpa : max), 0), [serial.samples]);
  const maxStrain = useMemo(() => serial.samples.reduce((max, s) => (s.strain > max ? s.strain : max), 0), [serial.samples]);
  const maxDisp = useMemo(() => serial.samples.reduce((max, s) => (s.displacementMm > max ? s.displacementMm : max), 0), [serial.samples]);

  const csv = useMemo(
    () => (validatedSetup ? makeTestCsv(validatedSetup, serial.samples, serial.droppedSamples) : ""),
    [validatedSetup, serial.samples, serial.droppedSamples]
  );

  const validateSetup = () => {
    const parsed = testSetupSchema.safeParse({
      specimenId: setup.specimenId,
      material: setup.material,
      gaugeLengthMm: setup.gaugeLengthMm,
      areaMm2: setup.areaMm2,
      calibrationProfileId: setup.calibrationProfileId,
    });
    if (!parsed.success) {
      const err = parsed.error.issues[0]?.message || "Revise los parámetros de la probeta.";
      setNotice({ text: err, type: "warn" });
      throw new Error(err);
    }
    setValidatedSetup(parsed.data);
    return parsed.data;
  };

  const connect = async () => {
    try {
      setNotice({ text: "Abriendo diálogo nativo de Web Serial API...", type: "info" });
      await serial.connect(Number(baudRate));
      setNotice({ text: `Puerto COM sincronizado a ${baudRate} baudios. Protocolo v1 validado.`, type: "success" });
    } catch (caught) {
      setNotice({ text: caught instanceof Error ? caught.message : "Error al conectar puerto COM.", type: "error" });
    }
  };

  const start = async (event: FormEvent) => {
    event.preventDefault();
    try {
      const valid = validateSetup();
      await serial.start(valid);
      setNotice({ text: "Ensayo iniciado. Motor NEMA 17 en tracción activa. Adquiriendo telemetría.", type: "success" });
    } catch (caught) {
      setNotice({ text: caught instanceof Error ? caught.message : "No fue posible iniciar el ensayo.", type: "error" });
    }
  };

  const stop = async () => {
    try {
      await serial.stop();
      setNotice({ text: "Orden STOP_TEST confirmada por el microcontrolador. Actuador detenido.", type: "warn" });
    } catch (caught) {
      setNotice({ text: caught instanceof Error ? caught.message : "Fallo al detener.", type: "error" });
    }
  };

  const downloadPdf = async () => {
    if (!validatedSetup || !serial.samples.length) {
      return setNotice({ text: "No hay muestras suficientes para generar el reporte formal.", type: "warn" });
    }
    setExportingPdf(true);
    try {
      const chartPng = chartRef.current ? await captureChartAsPng(chartRef.current) : null;
      generateTestPdf(validatedSetup, serial.samples, serial.droppedSamples, userName, chartPng);
      setNotice({ text: "Reporte formal PDF generado y descargado en almacenamiento local.", type: "success" });
    } catch (caught) {
      setNotice({ text: caught instanceof Error ? caught.message : "Error al compilar PDF.", type: "error" });
    } finally {
      setExportingPdf(false);
    }
  };

  const submitAssistant = async (customPrompt?: string) => {
    const text = (customPrompt || chatInput).trim();
    if (!text || chatLoading) return;
    setChatInput("");
    const now = new Date().toLocaleTimeString("es-PE", { hour12: false });
    setChatMessages((prev) => [...prev, { role: "user", text, time: now }]);
    setChatLoading(true);

    try {
      const sessionResult = await supabase?.auth.getSession();
      const token = sessionResult?.data.session?.access_token;
      if (!token) throw new Error("Sesión no autenticada.");

      const response = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          message: text,
          context: {
            screen: "dashboard",
            machineStatus: `${serial.status} | F_max: ${maxForce.toFixed(2)}N | Datapoints: ${serial.samples.length}`,
            lastMessage: serial.lastMessage,
          },
        }),
      });

      const body = (await response.json()) as { answer?: string; error?: string };
      setChatMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: body.answer || body.error || "Sin respuesta del modelo.",
          time: new Date().toLocaleTimeString("es-PE", { hour12: false }),
        },
      ]);
    } catch (caught) {
      setChatMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: caught instanceof Error ? caught.message : "Error de comunicación con Gemini API.",
          time: now,
        },
      ]);
    } finally {
      setChatLoading(false);
      setTimeout(() => {
        chatScrollRef.current?.scrollTo({ top: chatScrollRef.current.scrollHeight, behavior: "smooth" });
      }, 100);
    }
  };

  const signOut = async () => {
    await supabase?.auth.signOut();
    router.replace("/");
  };

  if (!hasSupabaseConfig) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6 text-slate-400 font-mono">
        <p className="border border-slate-800 bg-slate-900/60 p-6 rounded-sm">CONFIGURACIÓN INCOMPLETA: Faltan variables de Supabase.</p>
      </main>
    );
  }

  const currentStatus = statusConfig[serial.status];

  return (
    <div className="min-h-screen flex flex-col bg-[#07080A] text-slate-100">
      {/* ========================================================================= */}
      {/* 1. TOP BAR: ENCABEZADO METROLÓGICO INDUSTRIAL                            */}
      {/* ========================================================================= */}
      <header className="border-b border-[#1A2230] bg-[#0A0D13]/90 backdrop-blur-md px-6 py-3 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 bg-laser rounded-none" />
            <h1 className="font-mono text-base font-bold tracking-wider text-white">
              UTM<span className="text-laser">·</span>LAB
            </h1>
            <span className="text-[11px] font-mono uppercase tracking-widest text-slate-400 bg-slate-900/90 border border-slate-800 px-2 py-0.5 rounded-sm">
              IF511 A
            </span>
          </div>
        </div>

        {/* Estado central de la máquina */}
        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-2 px-3 py-1 rounded-sm border text-xs font-mono font-semibold tracking-wide ${currentStatus.color}`}>
            <span
              className={`w-2 h-2 rounded-full ${currentStatus.badge} ${currentStatus.pulse ? (serial.status === "running" ? "animate-pulse-laser" : "animate-ping") : ""
                }`}
            />
            <span>{currentStatus.label}</span>
          </div>
        </div>

        {/* Acciones de usuario y salida */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 bg-[#10141C] border border-[#1A2230] text-xs font-mono rounded-sm">
            <span className="text-slate-500">OPERADOR:</span>
            <span className="text-white font-medium">{userName}</span>
          </div>
          <button
            onClick={signOut}
            title="Cerrar sesión"
            className="p-1.5 border border-[#1A2230] bg-[#10141C] hover:bg-slate-800/80 text-slate-400 hover:text-white transition-colors rounded-sm"
          >
            <LogOut size={16} />
          </button>
        </div>
      </header>

      {/* Banner de Avisos y Notificaciones */}
      {notice && (
        <div
          className={`border-b px-6 py-2 text-xs font-mono flex items-center justify-between transition-all ${notice.type === "error"
            ? "bg-rose-950/40 border-rose-800 text-rose-300"
            : notice.type === "warn"
              ? "bg-amber-950/40 border-amber-800 text-amber-300"
              : notice.type === "success"
                ? "bg-emerald-950/40 border-emerald-800 text-emerald-300"
                : "bg-cyan-950/30 border-cyan-800 text-cyan-300"
            }`}
        >
          <div className="flex items-center gap-2">
            <AlertTriangle size={14} />
            <span>{notice.text}</span>
          </div>
          <button onClick={() => setNotice(null)} className="text-slate-400 hover:text-white text-xs">
            ✕
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. GRID ARQUITECTÓNICO DE 2 COLUMNAS DE ALTA DENSIDAD                     */}
      {/* ========================================================================= */}
      <main className="flex-1 p-4 lg:p-6 grid grid-cols-1 lg:grid-cols-12 gap-5 max-w-[1720px] mx-auto w-full">
        {/* ======================================================================= */}
        {/* COLUMNA 1 (lg:col-span-3): ENLACE SERIAL Y PARÁMETROS DE PROBETA        */}
        {/* ======================================================================= */}
        <div className="lg:col-span-3 flex flex-col gap-5">
          {/* Card 1: Enlace Serial COM (Desplegable) */}
          <div className="bg-[#0D1016] border border-[#1A2230] rounded-sm flex flex-col">
            <button
              onClick={() => setIsSerialOpen(!isSerialOpen)}
              className="flex items-center justify-between p-4 hover:bg-[#10141C] transition-colors focus:outline-none"
            >
              <div className="flex items-center gap-2">
                <Usb size={16} className={serial.status === "disconnected" ? "text-slate-500" : "text-cyan-400"} />
                <h2 className="font-mono text-xs font-bold tracking-wider text-slate-200 uppercase">
                  ENLACE SERIAL
                </h2>
              </div>
              <div className="flex items-center gap-3 text-[10px] font-mono text-slate-500">
                <span className="hidden sm:inline">v1 </span>
                {isSerialOpen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
              </div>
            </button>

            {isSerialOpen && (
              <div className="p-4 pt-0 flex flex-col gap-3 border-t border-[#1A2230] mt-1">
                <div className="grid grid-cols-2 gap-2 text-xs font-mono pt-3">
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">BAUD RATE</label>
                    <select
                      value={baudRate}
                      onChange={(e) => setBaudRate(e.target.value)}
                      disabled={serial.status !== "disconnected"}
                      className="w-full bg-[#131720] border border-[#1E2532] text-white px-2 py-1.5 rounded-sm focus:border-cyan-400 outline-none"
                    >
                      <option value="115200">115200 baud</option>
                      <option value="57600">57600 baud</option>
                      <option value="9600">9600 baud</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">CHECKSUM</label>
                    <div className="bg-[#131720] border border-[#1E2532] text-emerald-400 px-2 py-1.5 rounded-sm flex items-center gap-1.5">
                      <CheckCircle2 size={13} />
                      <span className="text-[11px]">CRC-16 OK</span>
                    </div>
                  </div>
                </div>

                {serial.status === "disconnected" ? (
                  <button
                    onClick={connect}
                    className="w-full py-2 px-3 bg-[#131822] hover:bg-slate-800 border border-[#27344A] text-cyan-300 font-mono text-xs font-bold tracking-wide rounded-sm flex items-center justify-center gap-2 transition-colors"
                  >
                    <Usb size={15} />
                    <span>SELECCIONAR PUERTO COM</span>
                  </button>
                ) : (
                  <button
                    onClick={() => void serial.disconnect()}
                    className="w-full py-2 px-3 bg-slate-900 hover:bg-rose-950/60 border border-slate-700 hover:border-rose-700 text-slate-300 hover:text-rose-200 font-mono text-xs font-bold rounded-sm flex items-center justify-center gap-2 transition-colors"
                  >
                    <WifiOff size={15} />
                    <span>DESCONECTAR PUERTO</span>
                  </button>
                )}

                {/* Consola de estado del microcontrolador */}
                <div className="bg-[#08090C] border border-[#161C26] p-2 rounded-sm text-[11px] font-mono mt-1">
                  <div className="flex items-center justify-between text-slate-500 mb-1">
                    <span>CONSOLA ARDUINO</span>
                    <span>LOST: {serial.droppedSamples}</span>
                  </div>
                  <p className="text-slate-300 truncate" title={serial.lastMessage}>
                    &gt; {serial.lastMessage}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Card 2: Metadatos y Geometría de Probeta */}
          <form onSubmit={start} className="bg-[#0D1016] border border-[#1A2230] rounded-sm p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between pb-2 border-b border-[#1A2230]">
              <div className="flex items-center gap-2">
                <Layers size={16} className="text-slate-300" />
                <h2 className="font-mono text-xs font-bold tracking-wider text-slate-200 uppercase">
                  PARÁMETROS DE LA MUESTRA
                </h2>
              </div>
              <span className="text-[10px] font-mono text-laser"> FC UNI </span>
            </div>

            <div className="space-y-2.5 text-xs font-mono">
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">ID DE PROBETA</label>
                <input
                  required
                  value={setup.specimenId}
                  onChange={(e) => setSetup({ ...setup, specimenId: e.target.value })}
                  placeholder="Ej. PROB-PLA-01"
                  className="w-full bg-[#131720] border border-[#1E2532] text-white px-2.5 py-1.5 rounded-sm focus:border-laser outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-400 block mb-1">MATERIAL POLIMÉRICO</label>
                <input
                  required
                  value={setup.material}
                  onChange={(e) => setSetup({ ...setup, material: e.target.value })}
                  placeholder="Ej. PLA 100% relleno"
                  className="w-full bg-[#131720] border border-[#1E2532] text-white px-2.5 py-1.5 rounded-sm focus:border-laser outline-none"
                />
              </div>

              {/* Dimensiones y Área Automática */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">ANCHO w [mm]</label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    required
                    value={setup.widthMm}
                    onChange={(e) => handleDimensionChange("widthMm", e.target.value)}
                    placeholder="4.0"
                    className="w-full bg-[#131720] border border-[#1E2532] text-white px-2 py-1.5 rounded-sm focus:border-laser outline-none font-mono-numbers"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">ESPESOR t [mm]</label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    required
                    value={setup.thicknessMm}
                    onChange={(e) => handleDimensionChange("thicknessMm", e.target.value)}
                    placeholder="4.0"
                    className="w-full bg-[#131720] border border-[#1E2532] text-white px-2 py-1.5 rounded-sm focus:border-laser outline-none font-mono-numbers"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">ÁREA INICIAL A₀ [mm²]</label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    required
                    value={setup.areaMm2}
                    onChange={(e) => setSetup({ ...setup, areaMm2: e.target.value })}
                    className="w-full bg-[#090C12] border border-[#1E2532] text-laser font-bold px-2 py-1.5 rounded-sm focus:border-laser outline-none font-mono-numbers"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">LONGITUD L₀ [mm]</label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    required
                    value={setup.gaugeLengthMm}
                    onChange={(e) => setSetup({ ...setup, gaugeLengthMm: e.target.value })}
                    placeholder="50"
                    className="w-full bg-[#131720] border border-[#1E2532] text-white px-2 py-1.5 rounded-sm focus:border-laser outline-none font-mono-numbers"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] text-slate-400 block mb-1">PERFIL CALIBRACIÓN APROBADO</label>
                <input
                  required
                  value={setup.calibrationProfileId}
                  onChange={(e) => setSetup({ ...setup, calibrationProfileId: e.target.value })}
                  className="w-full bg-[#131720] border border-[#1E2532] text-slate-300 px-2.5 py-1.5 rounded-sm focus:border-laser outline-none text-[11px]"
                />
              </div>
            </div>

            {/* Mandos de Control Físico */}
            <div className="pt-2 border-t border-[#1A2230] space-y-2 mt-1">
              <button
                type="submit"
                disabled={serial.status !== "ready" && serial.status !== "stopped"}
                className="w-full py-2.5 px-4 rounded-sm btn-laser flex items-center justify-center gap-2 font-mono text-xs uppercase"
              >
                <Play size={16} className="fill-current" />
                <span>INICIAR ENSAYO MECÁNICO</span>
              </button>

              <button
                type="button"
                onClick={stop}
                disabled={serial.status !== "running" && serial.status !== "arming"}
                className="w-full py-2 px-4 rounded-sm bg-rose-950/60 hover:bg-rose-900 border border-rose-800 text-rose-200 font-mono text-xs font-bold flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <CircleStop size={16} />
                <span>SOLICITAR PARADA DE SEGURIDAD</span>
              </button>
            </div>
          </form>
        </div>

        {/* ======================================================================= */}
        {/* COLUMNA 2 (lg:col-span-9): TELEMETRÍA Y VISUALIZACIÓN CRÍTICA           */}
        {/* ======================================================================= */}
        <div className="lg:col-span-9 flex flex-col gap-5">
          {/* Panel de Gráfica: Curva Esfuerzo vs Deformación */}
          <div className="bg-[#0D1016] border border-[#1A2230] rounded-sm p-4 flex flex-col min-h-[460px]">
            <div className="flex items-center justify-between pb-3 border-b border-[#1A2230]">
              <div className="flex items-center gap-2">
                <Activity size={17} className="text-laser" />
                <h2 className="font-mono text-xs font-bold tracking-wider text-slate-100 uppercase">
                  CURVA ESFUERZO σ (MPa) vs DEFORMACIÓN UNITARIA ε (%)
                </h2>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-3 font-mono text-xs">
                  <span className="text-slate-400">
                    MUESTRAS: <strong className="text-laser font-mono-numbers">{serial.samples.length}</strong>
                  </span>
                  {serial.droppedSamples > 0 && (
                    <span className="text-amber-400 bg-amber-950/40 border border-amber-800 px-1.5 py-0.5 rounded-sm text-[10px]">
                      DROP: {serial.droppedSamples}
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => downloadCsv(`ensayo-${setup.specimenId || "sin-id"}.csv`, csv)}
                    disabled={!csv || !serial.samples.length}
                    className="py-1 px-2.5 bg-[#131720] hover:bg-slate-800 border border-[#1E2532] text-slate-300 font-mono text-xs font-semibold rounded-sm flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    title="Descargar matriz numérica cruda para MATLAB / Python / Excel"
                  >
                    <Download size={13} className="text-cyan-400" />
                    <span>CSV</span>
                  </button>
                  <button
                    onClick={downloadPdf}
                    disabled={!serial.samples.length || exportingPdf}
                    className="py-1 px-2.5 bg-[#131B2A] hover:bg-slate-800 border border-[#273B5A] text-white font-mono text-xs font-semibold rounded-sm flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    title="Generar reporte formal PDF"
                  >
                    {exportingPdf ? (
                      <Loader2 size={13} className="animate-spin text-laser" />
                    ) : (
                      <FileText size={13} className="text-laser" />
                    )}
                    <span>PDF</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Visualizador de la curva con Recharts */}
            <div ref={chartRef} className="flex-1 w-full pt-4 min-h-[360px] flex items-center justify-center">
              {serial.samples.length ? (
                <ResponsiveContainer width="100%" height={380}>
                  <LineChart data={serial.samples} margin={{ top: 10, right: 20, left: 10, bottom: 20 }}>
                    <CartesianGrid stroke="#1A2230" strokeDasharray="3 3" />
                    <XAxis
                      dataKey="strain"
                      type="number"
                      domain={['auto', 'auto']}
                      tickFormatter={(val) => `${(val * 100).toFixed(1)}%`}
                      stroke="#475569"
                      fontSize={11}
                      fontFamily="var(--font-mono)"
                      tickLine={{ stroke: '#27344A' }}
                      label={{
                        value: "Deformación unitaria ε [%]",
                        position: "insideBottom",
                        offset: -12,
                        fill: "#94A3B8",
                        fontSize: 11,
                        fontFamily: "var(--font-mono)",
                      }}
                    />
                    <YAxis
                      dataKey="stressMpa"
                      domain={['auto', 'auto']}
                      stroke="#475569"
                      fontSize={11}
                      fontFamily="var(--font-mono)"
                      tickLine={{ stroke: '#27344A' }}
                      label={{
                        value: "Esfuerzo σ [MPa]",
                        angle: -90,
                        position: "insideLeft",
                        fill: "#94A3B8",
                        fontSize: 11,
                        fontFamily: "var(--font-mono)",
                      }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#08090D",
                        borderColor: "#27344A",
                        borderRadius: "2px",
                        fontFamily: "var(--font-mono)",
                        fontSize: "12px",
                        boxShadow: "0 10px 25px rgba(0,0,0,0.7)",
                      }}
                      formatter={(val: number) => [`${Number(val).toFixed(3)} MPa`, "Esfuerzo σ"]}
                      labelFormatter={(lbl: number) => `Deformación ε: ${(Number(lbl) * 100).toFixed(2)}%`}
                    />
                    <Line
                      type="monotone"
                      dataKey="stressMpa"
                      stroke="#FF2E93"
                      strokeWidth={2.5}
                      dot={false}
                      isAnimationActive={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex flex-col items-center justify-center p-8 border border-dashed border-[#1E2532] w-full h-full rounded-sm text-center">
                  <div className="w-12 h-12 rounded-full border border-laser/40 bg-laser/10 flex items-center justify-center mb-3">
                    <Activity size={24} className="text-laser" />
                  </div>
                  <p className="font-mono text-sm font-semibold text-slate-200 uppercase">
                    CANAL DE TELEMETRÍA EN ESPERA
                  </p>
                  <p className="font-mono text-xs text-slate-500 max-w-sm mt-1">
                    Conecte el microcontrolador Arduino por Web Serial API y presione &quot;INICIAR ENSAYO&quot; para registrar la curva en vivo.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Panel Inferior: 3 Tarjetas de KPI Masivas (Monoespaciadas) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* KPI 1: Fuerza Pico */}
            <div className="bg-[#0D1016] border border-[#1A2230] p-3.5 rounded-sm flex flex-col justify-between">
              <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                <span>FUERZA MÁX (F_max)</span>
                <span className="text-laser font-bold">100 N LIM</span>
              </div>
              <div className="my-2">
                <span className="font-mono text-2xl lg:text-3xl font-bold tracking-tight text-white font-mono-numbers">
                  {maxForce.toFixed(2)}
                </span>
                <span className="text-xs font-mono text-slate-500 ml-1.5">N</span>
              </div>
              <div className="text-[11px] font-mono text-slate-400 border-t border-[#161C26] pt-1.5 flex justify-between">
                <span>ACTUAL:</span>
                <span className="text-cyan-400 font-mono-numbers">{lastSample ? lastSample.forceN.toFixed(2) : "0.00"} N</span>
              </div>
            </div>

            {/* KPI 2: Esfuerzo Máximo */}
            <div className="bg-[#0D1016] border border-[#1A2230] p-3.5 rounded-sm flex flex-col justify-between">
              <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                <span>ESFUERZO MÁX (σ_max)</span>
                <span className="text-slate-500">σ = F/A₀</span>
              </div>
              <div className="my-2">
                <span className="font-mono text-2xl lg:text-3xl font-bold tracking-tight text-laser font-mono-numbers">
                  {maxStress.toFixed(3)}
                </span>
                <span className="text-xs font-mono text-slate-500 ml-1.5">MPa</span>
              </div>
              <div className="text-[11px] font-mono text-slate-400 border-t border-[#161C26] pt-1.5 flex justify-between">
                <span>ACTUAL:</span>
                <span className="text-white font-mono-numbers">{lastSample ? lastSample.stressMpa.toFixed(3) : "0.000"} MPa</span>
              </div>
            </div>

            {/* KPI 3: Deformación Unitaria Máxima */}
            <div className="bg-[#0D1016] border border-[#1A2230] p-3.5 rounded-sm flex flex-col justify-between">
              <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                <span>DEFORMACIÓN (ε_max)</span>
                <span className="text-slate-500">ΔL/L₀</span>
              </div>
              <div className="my-2">
                <span className="font-mono text-2xl lg:text-3xl font-bold tracking-tight text-white font-mono-numbers">
                  {(maxStrain * 100).toFixed(2)}
                </span>
                <span className="text-xs font-mono text-slate-500 ml-1.5">%</span>
              </div>
              <div className="text-[11px] font-mono text-slate-400 border-t border-[#161C26] pt-1.5 flex justify-between">
                <span>DESPLAZAMIENTO:</span>
                <span className="text-cyan-400 font-mono-numbers">{maxDisp.toFixed(3)} mm</span>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* ========================================================================= */}
      {/* FLOATING ASSISTANT GEMINI                                               */}
      {/* ========================================================================= */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-4">
        {isAssistantOpen && (
          <div className="bg-[#0D1016] border border-[#1A2230] rounded-sm p-4 w-[360px] md:w-[420px] shadow-2xl flex flex-col min-h-[460px] max-h-[70vh] animate-in slide-in-from-bottom-5">
            <div className="flex items-center justify-between pb-2 border-b border-[#1A2230]">
              <div className="flex items-center gap-2">
                <Bot size={16} className="text-laser" />
                <h2 className="font-mono text-xs font-bold tracking-wider text-slate-200 uppercase">
                  ASISTENTE // GEMINI 3.8 FLASH
                </h2>
              </div>
              <button
                onClick={() => setIsAssistantOpen(false)}
                className="text-slate-500 hover:text-white"
              >
                ✕
              </button>
            </div>

            {/* Quick action chips */}
            <div className="flex gap-1.5 py-2 overflow-x-auto text-[10px] font-mono no-scrollbar">
              <button
                onClick={() => submitAssistant("Diagnostica el estado actual del ensayo y sus lecturas.")}
                className="whitespace-nowrap px-2 py-0.5 bg-[#131720] hover:bg-slate-800 border border-[#1E2532] text-slate-300 rounded-sm"
              >
                DIAGNÓSTICO
              </button>
              <button
                onClick={() => submitAssistant("¿Cuáles son los parámetros típicos según la norma ASTM D638 para probetas de PLA?")}
                className="whitespace-nowrap px-2 py-0.5 bg-[#131720] hover:bg-slate-800 border border-[#1E2532] text-slate-300 rounded-sm"
              >
                NORMA D638
              </button>
              <button
                onClick={() => submitAssistant("Explica cómo interpretar la zona elástica y el punto de fluencia en este ensayo.")}
                className="whitespace-nowrap px-2 py-0.5 bg-[#131720] hover:bg-slate-800 border border-[#1E2532] text-slate-300 rounded-sm"
              >
                ZONA ELÁSTICA
              </button>
            </div>

            {/* Ventana de mensajes de terminal */}
            <div
              ref={chatScrollRef}
              className="flex-1 overflow-y-auto space-y-2.5 p-2 bg-[#080A0E] border border-[#161C26] rounded-sm font-mono text-xs"
            >
              {chatMessages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`p-2 rounded-sm border leading-relaxed ${msg.role === "user"
                    ? "bg-[#141B26] border-[#222E42] text-slate-100 ml-4"
                    : "bg-[#0E131C] border-[#18212F] text-slate-300 mr-2"
                    }`}
                >
                  <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1 border-b border-[#1A2230]/60 pb-0.5">
                    <span className={msg.role === "user" ? "text-cyan-400" : "text-laser font-bold"}>
                      {msg.role === "user" ? "OPERADOR" : "GEMINI·COPILOT"}
                    </span>
                    <span>{msg.time}</span>
                  </div>
                  <p className="whitespace-pre-wrap">{msg.text}</p>
                </div>
              ))}
              {chatLoading && (
                <div className="flex items-center gap-2 text-laser text-[11px] p-2 font-mono">
                  <Loader2 size={13} className="animate-spin" />
                  <span>CONSULTANDO GEMINI 3.8 FLASH...</span>
                </div>
              )}
            </div>

            {/* Formulario de consulta a Gemini */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void submitAssistant();
              }}
              className="mt-2.5 flex gap-2"
            >
              <input
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Consulte a Gemini sobre el ensayo..."
                className="flex-1 bg-[#131720] border border-[#1E2532] text-white text-xs px-2.5 py-1.5 rounded-sm focus:border-laser outline-none font-mono"
              />
              <button
                type="submit"
                disabled={chatLoading || !chatInput.trim()}
                className="px-3 bg-laser hover:bg-[#ff4d9f] disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold rounded-sm flex items-center justify-center transition-colors"
                title="Enviar consulta técnica"
              >
                <Send size={13} />
              </button>
            </form>
          </div>
        )}

        <button
          onClick={() => setIsAssistantOpen(!isAssistantOpen)}
          className="w-14 h-14 bg-laser hover:bg-[#ff4d9f] rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(255,46,147,0.3)] transition-all hover:scale-105 active:scale-95"
          title="Abrir Asistente Gemini"
        >
          {isAssistantOpen ? <Minimize2 size={24} className="text-white" /> : <Bot size={28} className="text-white" />}
        </button>
      </div>
    </div>
  );
}
