"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Activity,
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  LockKeyhole,
  Loader2,
  ShieldCheck,
  Usb
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
          password
        });
        if (signInError) throw signInError;
        router.replace("/dashboard");
      } else {
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: {
              full_name: fullName.trim() || undefined
            }
          }
        });
        if (signUpError) throw signUpError;

        if (signUpData.session) {
          router.replace("/dashboard");
        } else {
          setSuccess("Cuenta registrada correctamente. Si su proyecto requiere confirmación por correo, revise su bandeja de entrada antes de acceder.");
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
    <main className="landing">
      <nav className="nav">
        <Link className="brand" href="/">UTM<span>·</span>Lab</Link>
        <span className="eyebrow">Instrumentación trazable</span>
      </nav>

      <section className="hero-layout">
        <div className="hero-text">
          <p className="eyebrow">Máquina universal de ensayos · Low cost</p>
          <h1>Datos de fuerza que se pueden defender.</h1>
          <p className="lead">
            Conecte su controlador, registre cada muestra y analice curvas de esfuerzo–deformación con la geometría y calibración que realmente usó.
          </p>
        </div>

        <div className="card auth-card">
          <div className="auth-header">
            <ShieldCheck size={22} />
            <h2>Acceso al laboratorio</h2>
          </div>

          {hasSupabaseConfig ? (
            <>
              <div className="auth-tabs" role="tablist">
                <button
                  type="button"
                  role="tab"
                  aria-selected={tab === "login"}
                  className={`auth-tab ${tab === "login" ? "active" : ""}`}
                  onClick={() => { setTab("login"); setError(null); setSuccess(null); }}
                >
                  Iniciar sesión
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={tab === "register"}
                  className={`auth-tab ${tab === "register" ? "active" : ""}`}
                  onClick={() => { setTab("register"); setError(null); setSuccess(null); }}
                >
                  Registrar operador
                </button>
              </div>

              {error && (
                <div className="auth-message error" role="alert">
                  <AlertCircle size={18} />
                  <span>{error}</span>
                </div>
              )}

              {success && (
                <div className="auth-message success" role="status">
                  <CheckCircle2 size={18} />
                  <span>{success}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="auth-form">
                {tab === "register" && (
                  <label>
                    Nombre completo del operador
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Ej. Ing. Carlos Pérez"
                      autoComplete="name"
                    />
                  </label>
                )}

                <label>
                  Correo electrónico
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="operador@laboratorio.edu"
                    autoComplete="email"
                  />
                </label>

                <label>
                  Contraseña
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete={tab === "login" ? "current-password" : "new-password"}
                  />
                </label>

                <button
                  type="submit"
                  className="button primary auth-submit"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      <span>Verificando…</span>
                    </>
                  ) : tab === "login" ? (
                    <>
                      <span>Ingresar al panel</span>
                      <ArrowRight size={18} />
                    </>
                  ) : (
                    <>
                      <span>Crear cuenta</span>
                      <ArrowRight size={18} />
                    </>
                  )}
                </button>
              </form>

              <p className="auth-footer-note">
                Acceso seguro mediante Supabase Auth y Row Level Security.
              </p>
            </>
          ) : (
            <p className="notice">
              La autenticación requiere configurar las credenciales de Supabase en <code>.env.local</code> o en las variables de entorno de Vercel. Revise <code>.env.example</code>.
            </p>
          )}
        </div>
      </section>

      <section className="feature-grid" aria-label="Características">
        <article>
          <Usb size={22} />
          <h2>Conexión local</h2>
          <p>El puerto serial se selecciona en el navegador del operador; los datos no dependen de la nube para mostrarse.</p>
        </article>
        <article>
          <Activity size={22} />
          <h2>Curvas reales</h2>
          <p>Sin datos de demostración: la gráfica se construye únicamente con muestras confirmadas por el controlador.</p>
        </article>
        <article>
          <LockKeyhole size={22} />
          <h2>Seguridad primero</h2>
          <p>La web solicita acciones. Los límites, el paro y las validaciones críticas viven en el controlador local.</p>
        </article>
      </section>
    </main>
  );
}
