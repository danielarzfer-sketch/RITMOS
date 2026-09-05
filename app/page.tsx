'use client'

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import CuentaAtras from "@/components/CuentaAtras";
import FormularioSesion from "@/components/FormularioSesion";
import type { Meta, SemanaCalculada } from "@/types/database";

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null);
  const [meta, setMeta] = useState<Meta | null>(null);
  const [semanaActual, setSemanaActual] = useState<SemanaCalculada | null>(null);
  const [loadingAI, setLoadingAI] = useState(false);
  const [resultadoIA, setResultadoIA] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [editandoMeta, setEditandoMeta] = useState(false);
  const [nombreMeta, setNombreMeta] = useState("");
  const [fechaObjetivo, setFechaObjetivo] = useState("");

  // Estado para el perfil, carreras recientes y Garmin
  const [edad, setEdad] = useState("");
  const [peso, setPeso] = useState("");
  const [estatura, setEstatura] = useState("");
  const [fcReposo, setFcReposo] = useState("");
  const [fcMax, setFcMax] = useState("");
  const [carrerasRecientes, setCarrerasRecientes] = useState("");
  const [consideraciones, setConsideraciones] = useState("");
  const [guardandoPerfil, setGuardandoPerfil] = useState(false);
  const [mensajePerfil, setMensajePerfil] = useState("");

  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    async function loadData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }
      setUser(user);

      // Cargar meta activa
      const { data: metaData } = await supabase
        .from("metas")
        .select("*")
        .eq("usuario_id", user.id)
        .eq("activa", true)
        .maybeSingle<Meta>();

      setMeta(metaData);
      if (metaData) {
        setNombreMeta(metaData.nombre);
        setFechaObjetivo(metaData.fecha_objetivo);
      }

      // Cargar perfil biométrico
      const { data: perfilData } = await supabase
        .from("perfiles")
        .select("*")
        .eq("usuario_id", user.id)
        .maybeSingle();

      if (perfilData) {
        setEdad(perfilData.edad || "");
        setPeso(perfilData.peso || "");
        setEstatura(perfilData.estatura || "");
        setFcReposo(perfilData.fc_reposo || "");
        setFcMax(perfilData.fc_max || "");
        setCarrerasRecientes(perfilData.carreras_recientes || "");
        setConsideraciones(perfilData.consideraciones || "");
      }

      // Cargar resumen semanal
      const { data: semanaData } = await supabase
        .from("v_semana_calculada")
        .select("*")
        .eq("usuario_id", user.id)
        .order("semana_inicio", { ascending: false })
        .limit(1)
        .maybeSingle<SemanaCalculada>();

      setSemanaActual(semanaData);
      setLoading(false);
    }

    loadData();
  }, [router, supabase]);

  const handleGuardarMeta = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    await supabase.from("metas").update({ activa: false }).eq("usuario_id", user.id);

    const { data, error } = await supabase.from("metas").insert([
      { usuario_id: user.id, nombre: nombreMeta, fecha_objetivo: fechaObjetivo, activa: true }
    ]).select().single();

    if (error) {
      alert("Error al guardar la meta: " + error.message);
    } else if (data) {
      setMeta(data);
      setEditandoMeta(false);
    }
  };

  const handleEliminarMeta = async () => {
    if (!meta || !user) return;
    await supabase.from("metas").update({ activa: false }).eq("id", meta.id);
    setMeta(null);
    setEditandoMeta(false);
    setNombreMeta("");
    setFechaObjetivo("");
  };

  const handleGuardarPerfil = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setGuardandoPerfil(true);
    setMensajePerfil("");

    const { error } = await supabase.from("perfiles").upsert({
      usuario_id: user.id,
      edad: edad ? Number(edad) : null,
      peso: peso ? Number(peso) : null,
      estatura: estatura ? Number(estatura) : null,
      fc_reposo: fcReposo ? Number(fcReposo) : null,
      fc_max: fcMax ? Number(fcMax) : null,
      carreras_recientes: carrerasRecientes,
      consideraciones,
    }, { onConflict: "usuario_id" });

    setGuardandoPerfil(false);
    if (!error) {
      setMensajePerfil("¡Datos biométricos y marcas guardados correctamente!");
      setTimeout(() => setMensajePerfil(""), 3000);
    } else {
      setMensajePerfil("Error al guardar perfil.");
    }
  };

  const handleAnalizarConIA = async () => {
    setLoadingAI(true);
    setResultadoIA(null);

    try {
      const res = await fetch("/api/analizar-entrenamientos", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setResultadoIA(data.resultado);
      } else {
        setResultadoIA(data.error || "Error al analizar.");
      }
    } catch {
      setResultadoIA("Error de conexión con el servidor.");
    } finally {
      setLoadingAI(false);
    }
  };

  if (loading) return <div className="text-center py-20 text-neutral-500">Cargando panel...</div>;

  return (
    <div className="min-h-screen bg-neutral-50 pb-12">
      <Navbar />
      <main className="max-w-xl mx-auto px-4 space-y-6">
        <h1 className="text-2xl font-bold text-neutral-900">Gestión de Ritmos de Carrera</h1>

        {/* Bloque de Integración con Garmin */}
        <div className="bg-white p-5 rounded-xl border border-neutral-200 shadow-sm space-y-3">
          <h2 className="font-semibold text-neutral-800">Sincronización con Garmin</h2>
          <p className="text-xs text-neutral-500">Conecta tu cuenta para importar automáticamente tus entrenamientos y marcas sin introducirlos a mano.</p>
          
          <button
            onClick={() => {
              window.location.href = "/api/garmin/auth";
            }}
            className="w-full bg-[#007cc3] hover:bg-[#00659d] text-white py-2.5 rounded-lg text-sm font-medium transition flex items-center justify-center space-x-2"
          >
            <span>Conectar con Garmin</span>
          </button>
        </div>

        {/* Bloque de Meta Opcional */}
        <div className="bg-white p-5 rounded-xl border border-neutral-200 shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="font-semibold text-neutral-800">Objetivo de Competición</h2>
            {meta && !editandoMeta && (
              <button onClick={() => setEditandoMeta(true)} className="text-xs text-blue-600 hover:underline">
                Editar / Cambiar meta
              </button>
            )}
          </div>

          {meta && !editandoMeta ? (
            <CuentaAtras fechaObjetivo={meta.fecha_objetivo} fechaInicio={meta.created_at} nombreMeta={meta.nombre} />
          ) : (
            <form onSubmit={handleGuardarMeta} className="space-y-3">
              <p className="text-xs text-neutral-500">Si no tienes competición próxima, puedes dejarlo vacío o configurar una.</p>
              <input
                type="text"
                placeholder="Nombre de la meta (ej. Media Maratón)"
                value={nombreMeta}
                onChange={(e) => setNombreMeta(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm"
              />
              <input
                type="date"
                value={fechaObjetivo}
                onChange={(e) => setFechaObjetivo(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm"
              />
              <div className="flex space-x-2">
                <button type="submit" className="flex-1 bg-black text-white py-2 rounded-lg text-sm font-medium">
                  Guardar Meta
                </button>
                {meta && (
                  <button type="button" onClick={handleEliminarMeta} className="bg-red-50 text-red-600 px-3 py-2 rounded-lg text-sm font-medium">
                    Eliminar Meta
                  </button>
                )}
              </div>
            </form>
          )}
        </div>

        {/* Bloque de Datos Biométricos, Pulsaciones y Carreras Recientes */}
        <div className="bg-white p-5 rounded-xl border border-neutral-200 shadow-sm space-y-4">
          <h2 className="font-semibold text-neutral-800">Datos Biométricos y Referencias de Carrera</h2>
          <p className="text-xs text-neutral-500">Crucial para que la IA entienda tu nivel real y calibre los ritmos.</p>
          
          {mensajePerfil && <div className="p-2 bg-green-50 text-green-700 text-xs rounded">{mensajePerfil}</div>}

          <form onSubmit={handleGuardarPerfil} className="space-y-3">
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-xs font-medium text-neutral-600 mb-1">Edad (años)</label>
                <input type="number" value={edad} onChange={(e) => setEdad(e.target.value)} className="w-full px-2 py-1.5 border rounded text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-600 mb-1">Peso (kg)</label>
                <input type="number" step="0.1" value={peso} onChange={(e) => setPeso(e.target.value)} className="w-full px-2 py-1.5 border rounded text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-600 mb-1">Estatura (cm)</label>
                <input type="number" value={estatura} onChange={(e) => setEstatura(e.target.value)} className="w-full px-2 py-1.5 border rounded text-sm" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium text-neutral-600 mb-1">FC Reposo (ppm)</label>
                <input type="number" placeholder="Ej. 50" value={fcReposo} onChange={(e) => setFcReposo(e.target.value)} className="w-full px-2 py-1.5 border rounded text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-600 mb-1">FC Máxima (ppm)</label>
                <input type="number" placeholder="Ej. 185" value={fcMax} onChange={(e) => setFcMax(e.target.value)} className="w-full px-2 py-1.5 border rounded text-sm" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-600 mb-1">Últimas carreras (Distancia, tiempo y fecha aproximada)</label>
              <textarea 
                value={carrerasRecientes} 
                onChange={(e) => setCarrerasRecientes(e.target.value)} 
                rows={2} 
                placeholder="Ej. 10k en 49:42 (mayo 2026), 5k en 22:15 (marzo 2026)..." 
                className="w-full px-2 py-1.5 border rounded text-sm" 
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-600 mb-1">Consideraciones adicionales</label>
              <textarea value={consideraciones} onChange={(e) => setConsideraciones(e.target.value)} rows={2} placeholder="Lesiones recientes, sensaciones..." className="w-full px-2 py-1.5 border rounded text-sm" />
            </div>

            <button type="submit" disabled={guardandoPerfil} className="w-full bg-neutral-900 text-white py-2 rounded-lg text-sm font-medium">
              {guardandoPerfil ? "Guardando..." : "Actualizar Perfil y Marcas"}
            </button>
          </form>
        </div>

        {/* Sección de IA (Gemini) */}
        <div className="bg-white border border-neutral-200 p-5 rounded-xl space-y-3 shadow-sm">
          <h2 className="font-semibold text-neutral-800">Coach IA: Cálculo de Ritmos</h2>
          <p className="text-sm text-neutral-600">
            Genera tus zonas basándose en tus entrenamientos, pulsaciones y marcas recientes.
          </p>
          <button
            onClick={handleAnalizarConIA}
            disabled={loadingAI}
            className="w-full bg-black text-white py-2.5 rounded-lg font-medium hover:bg-neutral-800 transition disabled:opacity-50"
          >
            {loadingAI ? "Calculando ritmos con IA..." : "Analizar con IA 🤖"}
          </button>

          {resultadoIA && (
            <div className="mt-4 p-4 bg-neutral-50 border border-neutral-200 rounded-lg text-sm whitespace-pre-wrap text-neutral-800">
              {resultadoIA}
            </div>
          )}
        </div>

        {meta && <FormularioSesion metaId={meta.id} />}
      </main>
    </div>
  );
}