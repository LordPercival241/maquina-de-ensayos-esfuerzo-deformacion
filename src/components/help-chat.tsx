"use client";

import { FormEvent, useState } from "react";
import { Bot, MessageCircle, Send, X } from "lucide-react";
import type { TestStatus } from "@/lib/test-domain";
import { supabase } from "@/lib/supabase";

type ChatMessage = { role: "user" | "assistant"; text: string };

export function HelpChat({ status, lastMessage }: { status: TestStatus; lastMessage: string }) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const message = input.trim();
    if (!message || loading) return;
    setInput(""); setMessages((current) => [...current, { role: "user", text: message }]); setLoading(true);
    try {
      const sessionResult = await supabase?.auth.getSession();
      const token = sessionResult?.data.session?.access_token;
      if (!token) throw new Error("La sesión no está disponible.");
      const response = await fetch("/api/assistant", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ message, context: { screen: "dashboard", machineStatus: status, lastMessage } }) });
      const body = await response.json() as { answer?: string; error?: string };
      setMessages((current) => [...current, { role: "assistant", text: body.answer || body.error || "No fue posible obtener ayuda." }]);
    } catch { setMessages((current) => [...current, { role: "assistant", text: "No se pudo contactar al asistente." }]); }
    finally { setLoading(false); }
  };
  return <>
    {open && <aside className="chat-panel" aria-label="Asistente de ayuda">
      <header><span><Bot size={18}/> Asistente de operación</span><button className="icon-button" onClick={() => setOpen(false)} aria-label="Cerrar ayuda"><X size={18}/></button></header>
      <p className="chat-disclaimer">Puede orientar y explicar. No controla el equipo ni sustituye el procedimiento de seguridad.</p>
      <div className="chat-messages">{messages.length === 0 && <p>Pregunte sobre conexión serial, preparación de ensayo o mensajes mostrados por el controlador.</p>}{messages.map((entry, index) => <p className={`message ${entry.role}`} key={index}>{entry.text}</p>)}{loading && <p className="message assistant">Consultando…</p>}</div>
      <form onSubmit={submit}><input value={input} onChange={(event) => setInput(event.target.value)} placeholder="Escriba su consulta" aria-label="Mensaje al asistente"/><button className="icon-button" disabled={loading} aria-label="Enviar"><Send size={17}/></button></form>
    </aside>}
    <button className="help-fab" onClick={() => setOpen((current) => !current)} aria-label="Abrir asistente de ayuda"><MessageCircle size={21}/><span>Ayuda</span></button>
  </>;
}
