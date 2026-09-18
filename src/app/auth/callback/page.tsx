"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { hasSupabaseConfig, supabase } from "@/lib/supabase";

export default function AuthCallbackPage() {
  const router = useRouter();
  const [message, setMessage] = useState("Completando el inicio de sesión…");
  useEffect(() => {
    const complete = async () => {
      if (!hasSupabaseConfig || !supabase) return setMessage("Falta configurar la autenticación.");
      const code = new URLSearchParams(window.location.search).get("code");
      if (!code) return setMessage("Google no devolvió un código de autorización.");
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) return setMessage(error.message);
      router.replace("/dashboard");
    };
    void complete();
  }, [router]);
  return <main className="centered"><p>{message}</p></main>;
}
