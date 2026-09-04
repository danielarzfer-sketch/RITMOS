import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import type { SesionCalculada } from "@/types/database";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// POST /api/analizar-semana
// body: { meta_id: string, semana_inicio: "2026-09-01" }
export async function POST(request: Request) {
  const { meta_id, semana_inicio } = await request.json();

  // 1. Autenticar al usuario que hace la petición
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  // 2. Recoger las sesiones de las últimas ~4 semanas para dar contexto real
  const { data: sesiones } = await supabase
    .from("v_sesion_calculada")
    .select("*")
    .eq("usuario_id", user.id)
    .eq("meta_id", meta_id)
    .order("fecha", { ascending: false })
    .limit(28)
    .returns<SesionCalculada[]>();

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

  const prompt = `Eres un entrenador de running analizando el progreso de un corredor
que prepara una media maratón. Aquí tienes sus últimas sesiones (más recientes primero):

${JSON.stringify(resumen, null, 2)}

En Z2 el corredor se guía más por sensaciones que por un ritmo estricto, así que
la sugerencia de ritmo easy/Z2 debe ser orientativa, no prescriptiva.

Responde ÚNICAMENTE con un JSON con esta forma exacta, sin texto adicional ni
bloques de código markdown:

{
  "ritmo_easy_seg_km": number,
  "ritmo_calidad_seg_km": number,
  "ritmo_long_seg_km": number,
  "ritmo_regenerativo_seg_km": number,
  "justificacion": "string breve (2-3 frases) explicando el razonamiento"
}`;

  // 4. Llamar a la API de Claude
  const respuesta = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1000,
    messages: [{ role: "user", content: prompt }],
  });

  const textBlock = respuesta.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    return NextResponse.json(
      { error: "Respuesta inesperada de Claude" },
      { status: 502 }
    );
  }

  let sugerencia;
  try {
    sugerencia = JSON.parse(textBlock.text);
  } catch {
    return NextResponse.json(
      { error: "No se pudo interpretar la sugerencia de Claude" },
      { status: 502 }
    );
  }

  // 5. Guardar la sugerencia (usa la service_role key porque el usuario
  //    normal no tiene permiso de INSERT sobre ritmos_sugeridos)
  const serviceClient = createServiceClient();
  const { data: guardado, error } = await serviceClient
    .from("ritmos_sugeridos")
    .upsert(
      {
        usuario_id: user.id,
        meta_id,
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
