import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

const requestSchema = z.object({
  message: z.string().trim().min(1).max(1500),
  context: z.object({
    screen: z.string().max(80),
    machineStatus: z.string().max(40),
    lastMessage: z.string().max(500).optional()
  })
});

const instructions = `Eres el asistente de UTM Lab, una interfaz para una máquina universal de ensayos de bajo costo.
Tu tarea es guiar al operador, explicar la interfaz y ayudar a diagnosticar mensajes observados.
No tienes acceso al Arduino, no puedes enviar comandos ni garantizar que una medición sea válida.
Nunca indiques cómo omitir un paro de emergencia, un final de carrera, una sobrecarga o una calibración vencida.
Ante un error de seguridad, indica detener el ensayo mediante el procedimiento físico aprobado y pedir revisión técnica.
No inventes características de la máquina, valores de calibración o normas. Responde en español, de forma breve y práctica.`;

export async function POST(request: NextRequest) {
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!apiKey || !model || !supabaseUrl || !supabaseKey) {
    return NextResponse.json({ error: "El asistente no está configurado en el servidor." }, { status: 503 });
  }
  if (!token) return NextResponse.json({ error: "Se requiere una sesión válida." }, { status: 401 });
  const authClient = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: authData, error: authError } = await authClient.auth.getUser(token);
  if (authError || !authData.user) return NextResponse.json({ error: "La sesión no es válida." }, { status: 401 });
  const parsed = requestSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Solicitud de ayuda inválida." }, { status: 400 });
  const { message, context } = parsed.data;
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      instructions,
      input: `Contexto de solo lectura:\nPantalla: ${context.screen}\nEstado: ${context.machineStatus}\nÚltimo mensaje: ${context.lastMessage || "sin mensaje"}\n\nConsulta del operador: ${message}`
    })
  });
  if (!response.ok) return NextResponse.json({ error: "El asistente no pudo responder en este momento." }, { status: 502 });
  const result = (await response.json()) as { output_text?: string };
  return NextResponse.json({ answer: result.output_text || "No se recibió una respuesta de texto." });
}
