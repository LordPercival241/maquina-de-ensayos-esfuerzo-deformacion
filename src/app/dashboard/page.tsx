"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Activity, CircleStop, Download, LogOut, Play, Save, Usb } from "lucide-react";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { HelpChat } from "@/components/help-chat";
import { makeTestCsv, downloadCsv } from "@/lib/csv";
import { hasSupabaseConfig, supabase } from "@/lib/supabase";
import { testSetupSchema, type TestSetup } from "@/lib/test-domain";
import { saveCompletedTest } from "@/lib/test-storage";
import { useSerialTestSession } from "@/hooks/use-serial-test-session";

const labels = { disconnected: "Desconectada", connecting: "Conectando", ready: "Lista", arming: "Armando", running: "En ensayo", stopped: "Finalizado", fault: "Fallo" } as const;
const initialSetup = { specimenId: "", material: "", gaugeLengthMm: "", areaMm2: "", calibrationProfileId: "" };

export default function DashboardPage() {
  const router = useRouter();
  const serial = useSerialTestSession();
  const [setup, setSetup] = useState(initialSetup);
  const [validatedSetup, setValidatedSetup] = useState<TestSetup | null>(null);
  const [baudRate, setBaudRate] = useState("");
  const [userName, setUserName] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const session = async () => {
      if (!supabase) return router.replace("/");
      const { data } = await supabase.auth.getUser();
      if (!data.user) return router.replace("/");
      setUserName(data.user.user_metadata.full_name || data.user.email || "Operador");
    };
    void session();
  }, [router]);

  const csv = useMemo(() => validatedSetup ? makeTestCsv(validatedSetup, serial.samples, serial.droppedSamples) : "", [validatedSetup, serial.samples, serial.droppedSamples]);
  const validateSetup = () => {
    const parsed = testSetupSchema.safeParse(setup);
    if (!parsed.success) throw new Error(parsed.error.issues[0]?.message || "Revise los datos del ensayo.");
    setValidatedSetup(parsed.data);
    return parsed.data;
  };
  const connect = async () => {
    try { await serial.connect(Number(baudRate)); } catch (caught) { setNotice(caught instanceof Error ? caught.message : "No fue posible abrir el puerto."); }
  };
  const start = async (event: FormEvent) => {
    event.preventDefault();
    try { await serial.start(validateSetup()); setNotice("El controlador confirmó el inicio del ensayo."); } catch (caught) { setNotice(caught instanceof Error ? caught.message : "No fue posible iniciar."); }
  };
  const stop = async () => { try { await serial.stop(); } catch (caught) { setNotice(caught instanceof Error ? caught.message : "No fue posible detener."); } };
  const save = async () => {
    if (!validatedSetup || !serial.samples.length) return setNotice("No hay muestras reales para guardar.");
    setSaving(true);
    try { const id = await saveCompletedTest(validatedSetup, csv, serial.samples.length); setNotice(`Ensayo ${id} guardado de forma trazable.`); }
    catch (caught) { setNotice(caught instanceof Error ? caught.message : "No fue posible guardar el ensayo."); }
    finally { setSaving(false); }
  };
  const signOut = async () => { await supabase?.auth.signOut(); router.replace("/"); };

  if (!hasSupabaseConfig) return <main className="centered"><p>Configure Supabase antes de usar el panel.</p></main>;
  return <main className="dashboard">
    <header className="dashboard-header"><div><p className="eyebrow">UTM · sesión de ensayo</p><h1>Panel de operación</h1></div><div className="user-actions"><span>{userName}</span><button className="icon-button" onClick={signOut} aria-label="Cerrar sesión"><LogOut size={18}/></button></div></header>
    {notice && <p className="notice" role="status">{notice}</p>}
    {serial.error && <p className="alert" role="alert">{serial.error}</p>}
    <section className="status-row"><div className={`machine-status ${serial.status}`}><span></span>{labels[serial.status]}</div><p><strong>Controlador:</strong> {serial.lastMessage}</p></section>
    <div className="dashboard-grid">
      <section className="card setup-card"><div className="section-title"><Usb size={18}/><h2>Conexión y configuración</h2></div>
        <div className="serial-controls"><label>Velocidad serial (baud)<input inputMode="numeric" value={baudRate} onChange={(event) => setBaudRate(event.target.value)} placeholder="Definida por el firmware"/></label>{serial.status === "disconnected" ? <button className="button secondary" onClick={connect}><Usb size={17}/>Seleccionar puerto COM</button> : <button className="button secondary" onClick={() => void serial.disconnect()}>Desconectar</button>}</div>
        <form onSubmit={start} className="setup-form"><label>ID de probeta<input required value={setup.specimenId} onChange={(e) => setSetup({ ...setup, specimenId: e.target.value })}/></label><label>Material<input required value={setup.material} onChange={(e) => setSetup({ ...setup, material: e.target.value })}/></label><label>Longitud inicial L₀ (mm)<input required type="number" min="0" step="any" value={setup.gaugeLengthMm} onChange={(e) => setSetup({ ...setup, gaugeLengthMm: e.target.value })}/></label><label>Área inicial A₀ (mm²)<input required type="number" min="0" step="any" value={setup.areaMm2} onChange={(e) => setSetup({ ...setup, areaMm2: e.target.value })}/></label><label>Perfil de calibración aprobado<input required value={setup.calibrationProfileId} onChange={(e) => setSetup({ ...setup, calibrationProfileId: e.target.value })} placeholder="ID versionado"/></label><p className="form-note">El controlador local debe verificar límites, paro de emergencia, sensores y perfil antes de aceptar el armado.</p><button className="button primary" disabled={serial.status !== "ready" && serial.status !== "stopped"} type="submit"><Play size={17}/>Armar e iniciar ensayo</button></form>
        <button className="button danger" disabled={serial.status !== "running" && serial.status !== "arming"} onClick={stop}><CircleStop size={17}/>Solicitar parada</button>
      </section>
      <section className="card chart-card"><div className="section-title"><Activity size={18}/><h2>Esfuerzo–deformación</h2><span>{serial.samples.length} muestras</span></div>{serial.droppedSamples > 0 && <p className="alert">Se detectaron {serial.droppedSamples} muestras faltantes por secuencia. Revise la calidad de adquisición.</p>}{serial.samples.length ? <ResponsiveContainer width="100%" height={360}><LineChart data={serial.samples}><XAxis dataKey="strain" type="number" tickFormatter={(value) => `${(value * 100).toFixed(1)}%`} label={{ value: "Deformación", position: "insideBottom", offset: -5 }}/><YAxis dataKey="stressMpa" label={{ value: "Esfuerzo (MPa)", angle: -90, position: "insideLeft" }}/><Tooltip formatter={(value: number) => value.toFixed(5)}/><Line dataKey="stressMpa" stroke="#7dd3fc" dot={false} isAnimationActive={false}/></LineChart></ResponsiveContainer> : <div className="empty-chart"><Activity size={30}/><p>Esperando muestras verificadas del controlador.</p><small>La curva se mostrará cuando lleguen mensajes <code>SAMPLE</code> válidos.</small></div>}
        <div className="export-row"><button className="button secondary" disabled={!csv} onClick={() => downloadCsv(`ensayo-${validatedSetup?.specimenId || "sin-id"}.csv`, csv)}><Download size={17}/>Descargar CSV</button><button className="button primary" disabled={!csv || saving} onClick={save}><Save size={17}/>{saving ? "Guardando…" : "Guardar en nube"}</button></div>
      </section>
    </div>
    <HelpChat status={serial.status} lastMessage={serial.lastMessage}/>
  </main>;
}
