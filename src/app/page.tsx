"use client";

import Link from "next/link";
import { Activity, ArrowRight, LockKeyhole, Usb } from "lucide-react";
import { hasSupabaseConfig, supabase } from "@/lib/supabase";

export default function HomePage() {
  const signIn = async () => {
    if (!supabase) return;
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` }
    });
  };

  return (
    <main className="landing">
      <nav className="nav"><Link className="brand" href="/">UTM<span>·</span>Lab</Link><span className="eyebrow">Instrumentación trazable</span></nav>
      <section className="hero">
        <p className="eyebrow">Máquina universal de ensayos · Low cost</p>
        <h1>Datos de fuerza que se pueden defender.</h1>
        <p className="lead">Conecte su controlador, registre cada muestra y analice curvas de esfuerzo–deformación con la geometría y calibración que realmente usó.</p>
        {hasSupabaseConfig ? (
          <button className="button primary" onClick={signIn}>Ingresar con Google <ArrowRight size={18} /></button>
        ) : (
          <p className="notice">La autenticación aún requiere configurar Supabase y Google OAuth. Revise <code>.env.example</code>.</p>
        )}
      </section>
      <section className="feature-grid" aria-label="Características">
        <article><Usb size={22}/><h2>Conexión local</h2><p>El puerto serial se selecciona en el navegador del operador; los datos no dependen de la nube para mostrarse.</p></article>
        <article><Activity size={22}/><h2>Curvas reales</h2><p>Sin datos de demostración: la gráfica se construye únicamente con muestras confirmadas por el controlador.</p></article>
        <article><LockKeyhole size={22}/><h2>Seguridad primero</h2><p>La web solicita acciones. Los límites, el paro y las validaciones críticas viven en el controlador local.</p></article>
      </section>
    </main>
  );
}
