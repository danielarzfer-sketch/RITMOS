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

    // Desactivar metas anteriores
    await supabase.from("metas").update({ activa: false }).eq("usuario_id", user.id);

    // Crear nueva meta
    const { data, error } = await supabase.from("metas").insert([
      { usuario_id: user.id, nombre: nombreMeta, fecha_objetivo: fechaObjetivo, activa: true }
    ]).select().single();

    if (!error && data) {
      setMeta(data);
      setEditandoMeta(false);
    }
  };

  const handleEliminarMeta = async () => {
    if (!meta || !user) return;
    await supabase.from("metas").update({ activa: false }).eq("id", meta.id);
    setMeta(null);
    setEditandoMeta(false);
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
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-neutral-900">Gestión de Ritmos de Carrera</h1>
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
              <p className="text-xs text-neutral-500">Si no tienes una competición próxima, puedes dejarlo sin meta o configurar una.</p>
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

        {/* Resumen Semanal */}
        {semanaActual && (
          <div className="bg-white rounded-xl border border-neutral-200 p-5 grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-neutral-400">Km totales semana</p>
              <p className="text-lg font-semibold">{semanaActual.km_totales_semana} km</p>
            </div>
            <div>
              <p className="text-neutral-400">Km calidad semana</p>
              <p className="text-lg font-semibold">{semanaActual.km_calidad_semana} km</p>
            </div>
            <div>
              <p className="text-neutral-400">% Z2 semana</p>
              <p className="text-lg font-semibold">{semanaActual.pct_z2_semana}%</p>
            </div>
            <div>
              <p className="text-neutral-400">% calidad semana</p>
              <p className="text-lg font-semibold">{semanaActual.pct_calidad_semana}%</p>
            </div>
          </div>
        )}

        {/* Sección de IA (Gemini) */}
        <div className="bg-white border border-neutral-200 p-5 rounded-xl space-y-3 shadow-sm">
          <h2 className="font-semibold text-neutral-800">Coach IA: Cálculo de Ritmos (Easy, Long, Umbral, Z4, Z5)</h2>
          <p className="text-sm text-neutral-600">
            Gemini analizará tu historial, peso, estatura y edad para darte tus zonas exactas.
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