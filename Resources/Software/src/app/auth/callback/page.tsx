"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { hasSupabaseConfig, supabase } from "@/lib/supabase";

export default function AuthCallbackPage() {
  const router = useRouter();
  const [message, setMessage] = useState("Completando la autenticación…");
  useEffect(() => {
    const complete = async () => {
      if (!hasSupabaseConfig || !supabase) return setMessage("Falta configurar la autenticación en el servidor.");
      const code = new URLSearchParams(window.location.search).get("code");
      if (!code) return setMessage("No se recibió un código de autenticación válido.");
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) return setMessage(error.message);
      router.replace("/dashboard");
    };
    void complete();
  }, [router]);
  return <main className="centered"><p>{message}</p></main>;
}

