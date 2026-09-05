import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import type { SesionCalculada } from "@/types/database";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const meta_id = body.meta_id;
  const semana_inicio = body.semana_inicio || new Date().toISOString().split('T')[0];

  // 1. Autenticar al usuario que hace la petición
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  
  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  // 2. Recoger las sesiones (hasta las últimas 28 para dar contexto real)
  let query = supabase
    .from("v_sesion_calculada")
    .select("*")
    .eq("usuario_id", user.id)
    .order("fecha", { ascending: false })
    .limit(28);

  if (meta_id) {
    query = query.eq("meta_id", meta_id);
  }

  const { data: sesiones } = await query.returns<SesionCalculada[]>();

  if (!sesiones || sesiones.length === 0) {
    return NextResponse.json(
      { error: "No hay sesiones suficientes para analizar" },
      { status: 400 }
    );
  }

  // 3. Construir el prompt con los datos estructurados
  const resumen = sesiones.map((s) => ({
    fecha: s.fecha,
    tipo: s.tipo_tirada,
    km_totales: s.km_totales,
    km_z2: s.km_z2,
    km_calidad: s.km_calidad,
    ritmo_medio_seg_km: s.ritmo_medio_seg_km,
    ritmo_calidad_seg_km: s.ritmo_calidad_seg_km,
    ppm_medio: s.ppm_medio,
  }));

  const prompt = `Eres un entrenador de running analizando el progreso de un corredor. 
Aquí tienes sus últimas sesiones (más recientes primero):

${JSON.stringify(resumen, null, 2)}

En Z2 el corredor se guía más por sensaciones que por un ritmo estricto, así que
la sugerencia de ritmo easy/Z2 debe ser orientativa, no prescriptiva.

Responde ÚNICAMENTE con un objeto JSON válido con esta forma exacta, sin bloques de código markdown ni texto adicional alrededor:

{
  "ritmo_easy_seg_km": 0,
  "ritmo_calidad_seg_km": 0,
  "ritmo_long_seg_km": 0,
  "ritmo_regenerativo_seg_km": 0,
  "justificacion": "string breve (2-3 frases) explicando el razonamiento"
}`;

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Falta configurar la clave GEMINI_API_KEY en Vercel." }, { status: 500 });
  }

  // 4. Llamar a la API oficial de Gemini (usando gemini-2.5-flash)
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }]
    })
  });

  const data = await response.json();
  const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!rawText) {
    return NextResponse.json(
      { error: "Respuesta inesperada de Gemini" },
      { status: 502 }
    );
  }

  let sugerencia;
  try {
    // Limpiar posibles bloques de markdown si la IA los incluye por error
    const cleanedText = rawText.replace(/```json/g, "").replace(/```/g, "").trim();
    sugerencia = JSON.parse(cleanedText);
  } catch {
    return NextResponse.json(
      { error: "No se pudo interpretar la sugerencia de Gemini en formato JSON" },
      { status: 502 }
    );
  }

  // Si no se proveyó un meta_id en el body, intentamos buscar una meta activa del usuario para guardarlo bien
  let targetMetaId = meta_id;
  if (!targetMetaId) {
    const { data: metaActiva } = await supabase
      .from("metas")
      .select("id")
      .eq("usuario_id", user.id)
      .eq("activa", true)
      .maybeSingle();
      
    targetMetaId = metaActiva?.id || null;
  }

  if (!targetMetaId) {
    return NextResponse.json({ error: "Se necesita una meta activa para guardar la sugerencia." }, { status: 400 });
  }

  // 5. Guardar la sugerencia usando serviceClient para saltarse las restricciones de RLS en INSERT
  const serviceClient = createServiceClient();
  const { data: guardado, error } = await serviceClient
    .from("ritmos_sugeridos")
    .upsert(
      {
        usuario_id: user.id,
        meta_id: targetMetaId,
        semana_inicio,
        ritmo_easy_seg_km: sugerencia.ritmo_easy_seg_km,
        ritmo_calidad_seg_km: sugerencia.ritmo_calidad_seg_km,
        ritmo_long_seg_km: sugerencia.ritmo_long_seg_km,
        ritmo_regenerativo_seg_km: sugerencia.ritmo_regenerativo_seg_km,
        justificacion: sugerencia.justificacion,
        aceptado: null,
      },
      { onConflict: "usuario_id,meta_id,semana_inicio" }
    )
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ sugerencia: guardado });
}