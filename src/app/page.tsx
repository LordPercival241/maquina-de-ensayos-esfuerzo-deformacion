"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Activity,
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Cpu,
  FileText,
  HardDrive,
  Loader2,
  Lock,
  Mail,
  ShieldCheck,
  Usb,
  User
} from "lucide-react";
import { hasSupabaseConfig, supabase } from "@/lib/supabase";

export default function HomePage() {
  const router = useRouter();
  const [tab, setTab] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user) {
        router.replace("/dashboard");
      }
    });
  }, [router]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!supabase) return;
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      if (tab === "login") {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (signInError) throw signInError;
        router.replace("/dashboard");
      } else {
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: {
              full_name: fullName.trim() || undefined,
            },
          },
        });
        if (signUpError) throw signUpError;

        if (signUpData.session) {
          router.replace("/dashboard");
        } else {
          setSuccess("Cuenta registrada correctamente. Puede iniciar sesión con sus credenciales.");
          setTab("login");
        }
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Error al procesar la autenticación.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#07080A] text-slate-100">
      {/* Top Header */}
      <header className="border-b border-[#1A2230] bg-[#0A0D13]/80 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-2.5 h-2.5 bg-laser rounded-none" />
          <Link href="/" className="font-mono text-base font-bold tracking-wider text-white">
            UTM<span className="text-laser">·</span>LAB
          </Link>
          <span className="text-[11px] font-mono uppercase tracking-widest text-slate-400 bg-slate-900 border border-slate-800 px-2 py-0.5 rounded-sm">
            INSTRUMENTACIÓN METROLÓGICA
          </span>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="hidden sm:inline">SISTEMA EN LÍNEA // VERCEL EDGE</span>
        </div>
      </header>

      {/* Main Hero & Auth Split */}
      <main className="flex-1 flex items-center justify-center p-6 lg:p-12 max-w-6xl mx-auto w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center w-full">
          {/* Left Column: Technical Overview */}
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 bg-[#10141C] border border-[#1A2230] text-xs font-mono text-laser rounded-sm">
              <Activity size={14} />
              <span>CARACTERIZACIÓN DE MATERIALES HASTA 100 N</span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-white leading-tight font-sans">
              Datos de ensayo que se pueden <span className="text-laser">defender</span>.
            </h1>

            <p className="text-slate-400 text-sm sm:text-base leading-relaxed max-w-xl font-sans">
              Plataforma de adquisición serial en tiempo real para probetas poliméricas. Curvas continuas de esfuerzo $\sigma$ frente a deformación $\varepsilon$, cálculo de rigidez y reportes certificados sin intermediarios en la nube.
            </p>

            {/* Technical Spec Matrix */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2 font-mono text-xs">
              <div className="bg-[#0D1016] border border-[#1A2230] p-3 rounded-sm">
                <span className="text-[10px] text-slate-500 block mb-1">CELDA DE CARGA</span>
                <span className="text-white font-bold">10 kg / 100 N</span>
              </div>
              <div className="bg-[#0D1016] border border-[#1A2230] p-3 rounded-sm">
                <span className="text-[10px] text-slate-500 block mb-1">TRANSMISIÓN SERIAL</span>
                <span className="text-cyan-400 font-bold">115200 BAUD</span>
              </div>
              <div className="bg-[#0D1016] border border-[#1A2230] p-3 rounded-sm col-span-2 sm:col-span-1">
                <span className="text-[10px] text-slate-500 block mb-1">INTEGRIDAD</span>
                <span className="text-emerald-400 font-bold">CRC-16 / CCITT</span>
              </div>
            </div>

            <div className="flex flex-wrap gap-4 text-xs font-mono text-slate-400 pt-1">
              <span className="flex items-center gap-1.5">
                <HardDrive size={14} className="text-laser" /> Cero almacenamiento cloud
              </span>
              <span className="flex items-center gap-1.5">
                <FileText size={14} className="text-cyan-400" /> Exportación PDF con jsPDF
              </span>
              <span className="flex items-center gap-1.5">
                <Cpu size={14} className="text-emerald-400" /> Gemini 3.8 Flash
              </span>
            </div>
          </div>

          {/* Right Column: High-Precision Auth Card */}
          <div className="lg:col-span-5 bg-[#0D1016] border border-[#1A2230] p-6 lg:p-7 rounded-sm shadow-2xl flex flex-col gap-5">
            <div className="flex items-center justify-between pb-3 border-b border-[#1A2230]">
              <div className="flex items-center gap-2">
                <ShieldCheck size={18} className="text-laser" />
                <h2 className="font-mono text-xs font-bold tracking-wider text-slate-200 uppercase">
                  CONTROL DE ACCESO // OPERADORES
                </h2>
              </div>
              <span className="text-[10px] font-mono text-slate-500">AUTH RLS</span>
            </div>

            {/* Auth Tab Switcher */}
            <div className="grid grid-cols-2 p-1 bg-[#131720] border border-[#1E2532] rounded-sm text-xs font-mono">
              <button
                type="button"
                onClick={() => {
                  setTab("login");
                  setError(null);
                  setSuccess(null);
                }}
                className={`py-2 px-3 text-center transition-all rounded-sm font-semibold ${
                  tab === "login"
                    ? "bg-[#0D1016] text-laser border border-laser/30 shadow-sm"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                INICIAR SESIÓN
              </button>
              <button
                type="button"
                onClick={() => {
                  setTab("register");
                  setError(null);
                  setSuccess(null);
                }}
                className={`py-2 px-3 text-center transition-all rounded-sm font-semibold ${
                  tab === "register"
                    ? "bg-[#0D1016] text-laser border border-laser/30 shadow-sm"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                CREAR CUENTA
              </button>
            </div>

            {/* Error & Success Feedback */}
            {error && (
              <div className="p-3 bg-rose-950/40 border border-rose-800 text-rose-300 text-xs font-mono rounded-sm flex items-start gap-2">
                <AlertCircle size={15} className="mt-0.5 shrink-0 text-rose-400" />
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className="p-3 bg-emerald-950/40 border border-emerald-800 text-emerald-300 text-xs font-mono rounded-sm flex items-start gap-2">
                <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-emerald-400" />
                <span>{success}</span>
              </div>
            )}

            {/* Auth Form */}
            <form onSubmit={handleSubmit} className="space-y-3.5 text-xs font-mono">
              {tab === "register" && (
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">NOMBRE COMPLETO DEL OPERADOR</label>
                  <div className="relative">
                    <input
                      required
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Dante Olivas"
                      className="w-full bg-[#131720] border border-[#1E2532] text-white pl-9 pr-3 py-2 rounded-sm focus:border-laser outline-none"
                    />
                    <User size={15} className="absolute left-3 top-2.5 text-slate-500" />
                  </div>
                </div>
              )}

              <div>
                <label className="text-[11px] text-slate-400 block mb-1">CORREO INSTITUCIONAL O TÉCNICO</label>
                <div className="relative">
                  <input
                    required
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="operador@laboratorio.edu"
                    className="w-full bg-[#131720] border border-[#1E2532] text-white pl-9 pr-3 py-2 rounded-sm focus:border-laser outline-none"
                  />
                  <Mail size={15} className="absolute left-3 top-2.5 text-slate-500" />
                </div>
              </div>

              <div>
                <label className="text-[11px] text-slate-400 block mb-1">CONTRASEÑA DE ACCESO</label>
                <div className="relative">
                  <input
                    required
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full bg-[#131720] border border-[#1E2532] text-white pl-9 pr-3 py-2 rounded-sm focus:border-laser outline-none"
                  />
                  <Lock size={15} className="absolute left-3 top-2.5 text-slate-500" />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 rounded-sm btn-laser flex items-center justify-center gap-2 font-mono text-xs uppercase mt-2"
              >
                {loading ? (
                  <>
                    <Loader2 size={15} className="animate-spin" />
                    <span>AUTENTICANDO...</span>
                  </>
                ) : (
                  <>
                    <span>{tab === "login" ? "INGRESAR AL LABORATORIO" : "REGISTRAR OPERADOR"}</span>
                    <ArrowRight size={15} />
                  </>
                )}
              </button>
            </form>

            <div className="pt-2 border-t border-[#1A2230] text-center">
              <span className="text-[11px] font-mono text-slate-500">
                Seguridad garantizada mediante Supabase Auth y Row Level Security.
              </span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
