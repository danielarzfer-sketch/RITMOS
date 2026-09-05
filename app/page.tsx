'use client'

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
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
  const [pestanaActiva, setPestanaActiva] = useState<"resumen" | "entrenamientos">("resumen");

  // Estado para el perfil y marcas
  const [edad, setEdad] = useState("");
  const [peso, setPeso] = useState("");
  const [estatura, setEstatura] = useState("");
  const [fcReposo, setFcReposo] = useState("");
  const [fcMax, setFcMax] = useState("");
  const [carrerasRecientes, setCarrerasRecientes] = useState("");
  const [consideraciones, setConsideraciones] = useState("");
  const [guardandoPerfil, setGuardandoPerfil] = useState(false);
  const [mensajePerfil, setMensajePerfil] = useState("");
  const [errorPerfil, setErrorPerfil] = useState("");

  // Estado para mostrar los datos guardados actualmente en pantalla
  const [perfilGuardado, setPerfilGuardado] = useState<any>(null);
  const [editandoPerfil, setEditandoPerfil] = useState(false);

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
        setEdad(perfilData.edad ?? "");
        setPeso(perfilData.peso ?? "");
        setEstatura(perfilData.estatura ?? "");
        setFcReposo(perfilData.fc_reposo ?? "");
        setFcMax(perfilData.fc_max ?? "");
        setCarrerasRecientes(perfilData.carreras_recientes ?? "");
        setConsideraciones(perfilData.consideraciones ?? "");
        setPerfilGuardado(perfilData);
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
    if (!user || !nombreMeta || !fechaObjetivo) return;

    try {
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
    } catch (err: any) {
      alert("Error inesperado al guardar la meta: " + (err.message || err));
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
    setErrorPerfil("");

    const payload = {
      usuario_id: user.id,
      edad: edad !== "" ? Number(edad) : null,
      peso: peso !== "" ? Number(peso) : null,
      estatura: estatura !== "" ? Number(estatura) : null,
      fc_reposo: fcReposo !== "" ? Number(fcReposo) : null,
      fc_max: fcMax !== "" ? Number(fcMax) : null,
      carreras_recientes: carrerasRecientes,
      consideraciones,
    };

    const { data, error } = await supabase.from("perfiles").upsert(payload, { onConflict: "usuario_id" }).select().single();

    setGuardandoPerfil(false);
    if (!error) {
      setMensajePerfil("¡Perfil guardado correctamente!");
      if (data) setPerfilGuardado(data);
      setEditandoPerfil(false);
      setTimeout(() => setMensajePerfil(""), 3000);
    } else {
      setErrorPerfil("Error al guardar perfil: " + error.message);
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

  const calcularProgresoMeta = () => {
    if (!meta) return { diasRestantes: 0, porcentaje: 0, inicioStr: "", objetivoStr: "" };
    const hoy = new Date().getTime();
    const inicio = new Date(meta.created_at).getTime();
    const objetivo = new Date(meta.fecha_objetivo).getTime();

    const totalDias = Math.max(1, Math.ceil((objetivo - inicio) / (1000 * 60 * 60 * 24)));
    const diasTranscurridos = Math.max(0, Math.ceil((hoy - inicio) / (1000 * 60 * 60 * 24)));
    const diasRestantes = Math.max(0, Math.ceil((objetivo - hoy) / (1000 * 60 * 60 * 24)));

    let porcentaje = Math.min(100, Math.max(0, (diasTranscurridos / totalDias) * 100));

    const inicioStr = new Date(meta.created_at).toLocaleDateString();
    const objetivoStr = new Date(meta.fecha_objetivo).toLocaleDateString();

    return { diasRestantes, porcentaje, inicioStr, objetivoStr };
  };

  const progreso = calcularProgresoMeta();

  if (loading) return <div className="text-center py-20 text-neutral-500">Cargando panel...</div>;

  return (
    <div className="min-h-screen bg-neutral-50 pb-12">
      <Navbar />
      <main className="max-w-xl mx-auto px-4 space-y-6 pt-4">
        <h1 className="text-2xl font-bold text-neutral-900">Gestión de Ritmos de Carrera</h1>

        {/* Selector de Pestañas */}
        <div className="flex border-b border-neutral-200 space-x-6">
          <button
            onClick={() => setPestanaActiva("resumen")}
            className={`pb-3 font-medium text-sm transition-colors border-b-2 ${
              pestanaActiva === "resumen"
                ? "border-black text-black"
                : "border-transparent text-neutral-500 hover:text-neutral-800"
            }`}
          >
            📊 Resumen y Meta
          </button>
          <button
            onClick={() => setPestanaActiva("entrenamientos")}
            className={`pb-3 font-medium text-sm transition-colors border-b-2 ${
              pestanaActiva === "entrenamientos"
                ? "border-black text-black"
                : "border-transparent text-neutral-500 hover:text-neutral-800"
            }`}
          >
            🏃‍♂️ Añadir Entrenamientos
          </button>
        </div>

        {/* PESTAÑA 1: RESUMEN, META Y PERFIL */}
        {pestanaActiva === "resumen" && (
          <div className="space-y-6">
            {/* Bloque de Meta con Barra de Progreso Verde */}
            <div className="bg-white p-5 rounded-xl border border-neutral-200 shadow-sm space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="font-semibold text-neutral-800 flex items-center space-x-2">
                  <span>🎯</span>
                  <span>{meta ? meta.nombre : "Objetivo de Competición"}</span>
                </h2>
                {meta && !editandoMeta && (
                  <button onClick={() => setEditandoMeta(true)} className="text-xs text-blue-600 hover:underline">
                    Editar / Cambiar meta
                  </button>
                )}
              </div>

              {meta && !editandoMeta ? (
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="font-bold text-neutral-900 text-xl">{progreso.diasRestantes} días</span>
                    <span className="text-xs text-neutral-500">faltan para la meta</span>
                  </div>

                  <div className="w-full bg-neutral-100 h-3 rounded-full overflow-hidden">
                    <div 
                      className="bg-green-500 h-full transition-all duration-500 rounded-full" 
                      style={{ width: `${progreso.porcentaje}%` }}
                    ></div>
                  </div>

                  <div className="flex justify-between text-xs text-neutral-500 pt-1">
                    <span>Inicio: {progreso.inicioStr}</span>
                    <span>Objetivo: {progreso.objetivoStr}</span>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleGuardarMeta} className="space-y-3">
                  <p className="text-xs text-neutral-500">Configura tu próxima carrera para fijar el punto de partida y la línea de progreso.</p>
                  <input
                    type="text"
                    placeholder="Nombre de la meta (ej. Media Maratón)"
                    value={nombreMeta}
                    onChange={(e) => setNombreMeta(e.target.value)}
                    required
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                  />
                  <input
                    type="date"
                    value={fechaObjetivo}
                    onChange={(e) => setFechaObjetivo(e.target.value)}
                    required
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

            {/* Bloque de Datos Biométricos con Vista del Perfil Actual */}
            <div className="bg-white p-5 rounded-xl border border-neutral-200 shadow-sm space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="font-semibold text-neutral-800">Datos Biométricos y Referencias</h2>
                {perfilGuardado && !editandoPerfil && (
                  <button onClick={() => setEditandoPerfil(true)} className="text-xs text-blue-600 hover:underline">
                    Editar Perfil
                  </button>
                )}
              </div>

              {mensajePerfil && <div className="p-2 bg-green-50 text-green-700 text-xs rounded text-sm">{mensajePerfil}</div>}
              {errorPerfil && <div className="p-2 bg-red-50 text-red-700 text-xs rounded text-sm">{errorPerfil}</div>}

              {perfilGuardado && !editandoPerfil ? (
                <div className="bg-neutral-50 p-4 rounded-lg border border-neutral-200 space-y-2 text-sm text-neutral-700">
                  <p className="font-medium text-neutral-900 border-b pb-1">📋 Perfil Guardado Actual:</p>
                  <div className="grid grid-cols-3 gap-2 pt-1 text-xs">
                    <div><span className="text-neutral-500">Edad:</span> {perfilGuardado.edad ?? "-"} años</div>
                    <div><span className="text-neutral-500">Peso:</span> {perfilGuardado.peso ?? "-"} kg</div>
                    <div><span className="text-neutral-500">Estatura:</span> {perfilGuardado.estatura ?? "-"} cm</div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                    <div><span className="text-neutral-500">FC Reposo:</span> {perfilGuardado.fc_reposo ?? "-"} ppm</div>
                    <div><span className="text-neutral-500">FC Máxima:</span> {perfilGuardado.fc_max ?? "-"} ppm</div>
                  </div>
                  {perfilGuardado.carreras_recientes && (
                    <div className="text-xs pt-1"><span className="text-neutral-500">Carreras recientes:</span> {perfilGuardado.carreras_recientes}</div>
                  )}
                  {perfilGuardado.consideraciones && (
                    <div className="text-xs pt-1"><span className="text-neutral-500">Consideraciones:</span> {perfilGuardado.consideraciones}</div>
                  )}
                </div>
              ) : (
                <form onSubmit={handleGuardarPerfil} className="space-y-3">
                  <p className="text-xs text-neutral-500">Introduce o actualiza tus datos para calibrar los ritmos.</p>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-xs font-medium text-neutral-600 mb-1">Edad</label>
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
                    <label className="block text-xs font-medium text-neutral-600 mb-1">Últimas carreras (Distancia, tiempo y fecha)</label>
                    <textarea 
                      value={carrerasRecientes} 
                      onChange={(e) => setCarrerasRecientes(e.target.value)} 
                      rows={2} 
                      placeholder="Ej. 10k en 49:42 (mayo 2026)..." 
                      className="w-full px-2 py-1.5 border rounded text-sm" 
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-neutral-600 mb-1">Consideraciones adicionales</label>
                    <textarea value={consideraciones} onChange={(e) => setConsideraciones(e.target.value)} rows={2} placeholder="Lesiones, sensaciones..." className="w-full px-2 py-1.5 border rounded text-sm" />
                  </div>

                  <div className="flex space-x-2">
                    <button type="submit" disabled={guardandoPerfil} className="flex-1 bg-neutral-900 text-white py-2 rounded-lg text-sm font-medium">
                      {guardandoPerfil ? "Guardando..." : "Actualizar Perfil y Marcas"}
                    </button>
                    {perfilGuardado && (
                      <button type="button" onClick={() => setEditandoPerfil(false)} className="bg-neutral-200 text-neutral-800 px-3 py-2 rounded-lg text-sm font-medium">
                        Cancelar
                      </button>
                    )}
                  </div>
                </form>
              )}
            </div>

            {/* Sección de IA */}
            <div className="bg-white border border-neutral-200 p-5 rounded-xl space-y-3 shadow-sm">
              <h2 className="font-semibold text-neutral-800">Asesoramiento IA: Ritmo Objetivo y Zonas</h2>
              <p className="text-sm text-neutral-600">
                Analiza tus datos para ofrecerte un ritmo objetivo realista para tu meta y tus zonas de entrenamiento precisas.
              </p>
              <button
                onClick={handleAnalizarConIA}
                disabled={loadingAI}
                className="w-full bg-black text-white py-2.5 rounded-lg font-medium hover:bg-neutral-800 transition disabled:opacity-50"
              >
                {loadingAI ? "Calculando asesoramiento y ritmos..." : "Analizar con IA 🤖"}
              </button>

              {resultadoIA && (
                <div className="mt-4 p-4 bg-neutral-50 border border-neutral-200 rounded-lg text-sm whitespace-pre-wrap text-neutral-800 leading-relaxed">
                  {resultadoIA}
                </div>
              )}
            </div>
          </div>
        )}

        {/* PESTAÑA 2: AÑADIR ENTRENAMIENTOS */}
        {pestanaActiva === "entrenamientos" && (
          <div className="space-y-4">
            {!meta ? (
              <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl text-sm text-amber-800">
                Debes crear o configurar una meta primero en la pestaña de <strong>Resumen y Meta</strong> para poder asociar tus entrenamientos.
              </div>
            ) : (
              <FormularioSesion metaId={meta.id} />
            )}
          </div>
        )}
      </main>
    </div>
  );
}