import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

const requestSchema = z.object({
  message: z.string().trim().min(1).max(2000),
  context: z.object({
    screen: z.string().max(120),
    machineStatus: z.string().max(250),
    lastMessage: z.string().max(1000).optional()
  })
});

const instructions = `Eres el asistente de UTM Lab, una interfaz para una máquina universal de ensayos de bajo costo.
Tu tarea es guiar al operador, explicar la interfaz y ayudar a diagnosticar mensajes observados.
No tienes acceso al Arduino, no puedes enviar comandos ni garantizar que una medición sea válida.
Nunca indiques cómo omitir un paro de emergencia, un final de carrera, una sobrecarga o una calibración vencida.
Ante un error de seguridad, indica detener el ensayo mediante el procedimiento físico aprobado y pedir revisión técnica.
No inventes características de la máquina, valores de calibración o normas. Responde en español, de forma breve y práctica.`;

export async function POST(request: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.GEMINI_KEY;
  let rawModel = process.env.GEMINI_MODEL || "gemini-2.5-flash";
  // En Google AI Studio la API pública de Gemini admite gemini-1.5-flash, gemini-2.0-flash o gemini-1.5-pro.
  // Si se configuró gemini-2.5-flash, normalizamos a gemini-1.5-flash para que Google API no devuelva 404:
  if (rawModel.includes("2.5") || rawModel === "gemini-flash") {
    rawModel = "gemini-2.5-flash";
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");

  if (!apiKey) {
    return NextResponse.json(
      { error: "Falta configurar GEMINI_API_KEY en las variables de entorno de Vercel." },
      { status: 503 }
    );
  }
  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json(
      { error: "Faltan las variables de Supabase en el servidor." },
      { status: 503 }
    );
  }
  if (!token) return NextResponse.json({ error: "Se requiere una sesión válida." }, { status: 401 });

  const authClient = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: authData, error: authError } = await authClient.auth.getUser(token);
  if (authError || !authData.user) return NextResponse.json({ error: "La sesión no es válida." }, { status: 401 });

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json({ error: "El cuerpo de la solicitud no es un JSON válido." }, { status: 400 });
  }

  const parsed = requestSchema.safeParse(rawBody);
  if (!parsed.success) {
    const issue = parsed.error.issues[0]?.message || "Datos inválidos";
    return NextResponse.json({ error: `Solicitud inválida: ${issue}` }, { status: 400 });
  }
  const { message, context } = parsed.data;

  const makeGeminiRequest = async (modelToUse: string) => {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(modelToUse)}:generateContent?key=${encodeURIComponent(apiKey)}`;
    return fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(15000),
      body: JSON.stringify({
        system_instruction: {
          parts: [{ text: instructions }]
        },
        contents: [
          {
            role: "user",
            parts: [
              {
                text: `Contexto de solo lectura:\nPantalla: ${context.screen}\nEstado: ${context.machineStatus}\nÚltimo mensaje: ${context.lastMessage || "sin mensaje"}\n\nConsulta del operador: ${message}`
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.4,
          maxOutputTokens: 800
        }
      })
    });
  };

  try {
    let response = await makeGeminiRequest(rawModel);
    // Si el modelo retorna 404 (modelo no reconocido por Google), intentamos con gemini-2.5-flash
    if (response.status === 404 && rawModel !== "gemini-2.5-flash") {
      response = await makeGeminiRequest("gemini-2.5-flash");
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Gemini API error:", response.status, errorText);
      return NextResponse.json(
        { error: `Gemini API devolvió error (${response.status}). Verifique que GEMINI_API_KEY sea válida en Vercel.` },
        { status: 502 }
      );
    }

    const result = (await response.json()) as {
      candidates?: Array<{
        content?: {
          parts?: Array<{ text?: string }>;
        };
      }>;
    };
    const answer = result.candidates?.[0]?.content?.parts?.[0]?.text;
    return NextResponse.json({ answer: answer || "No se recibió una respuesta de texto del asistente." });
  } catch (caught) {
    const isTimeout = caught instanceof Error && caught.name === "TimeoutError";
    return NextResponse.json(
      { error: isTimeout ? "Tiempo de espera agotado al consultar a Gemini." : "Error de comunicación con el servicio de Gemini." },
      { status: isTimeout ? 504 : 502 }
    );
  }
}
