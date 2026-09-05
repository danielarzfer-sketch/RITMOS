import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function POST() {
  try {
    const supabase = await createClient();
    
    // 1. Obtener usuario autenticado
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // 2. Obtener el perfil y las marcas
    const { data: perfil } = await supabase
      .from("perfiles")
      .select("*")
      .eq("usuario_id", user.id)
      .maybeSingle();

    // 3. Obtener la meta activa
    const { data: meta } = await supabase
      .from("metas")
      .select("*")
      .eq("usuario_id", user.id)
      .eq("activa", true)
      .maybeSingle();

    // 4. Obtener las sesiones de entrenamiento recientes
    const { data: sesiones } = await supabase
      .from("sesiones_entrenamiento")
      .select("*")
      .eq("usuario_id", user.id)
      .order("fecha", { ascending: false })
      .limit(15);

    if (!meta) {
      return NextResponse.json({ error: "Primero debes configurar una meta activa." }, { status: 400 });
    }

    // 5. Construcción del prompt para Gemini
    const prompt = `
      Eres un entrenador experto en running. Analiza los datos de este atleta y dale un asesoramiento preciso:
      - Meta: ${meta.nombre} (Fecha objetivo: ${meta.fecha_objetivo})
      - Perfil biométrico: Edad ${perfil?.edad || 'N/D'}, Peso ${perfil?.peso || 'N/D'}kg, FC Reposo ${perfil?.fc_reposo || 'N/D'} ppm, FC Máx ${perfil?.fc_max || 'N/D'} ppm.
      - Últimas carreras: ${perfil?.carreras_recientes || 'Ninguna registrada'}.
      - Consideraciones: ${perfil?.consideraciones || 'Ninguna'}.
      - Entrenamientos recientes: ${JSON.stringify(sesiones || [])}.

      Proporciona de forma clara y estructurada:
      1. Análisis breve de su estado actual.
      2. Ritmo objetivo realista para su meta.
      3. Zonas de entrenamiento orientativas.
      4. Consejos prácticos para las próximas semanas.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    const resultado = response.text;

    return NextResponse.json({ resultado });
  } catch (err: any) {
    console.error("Error en API de análisis con Gemini:", err);
    return NextResponse.json({ error: "Error en el servidor: " + (err.message || err) }, { status: 500 });
  }
}v17