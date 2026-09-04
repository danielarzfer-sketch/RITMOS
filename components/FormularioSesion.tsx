"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { TipoTirada } from "@/types/database";

interface Serie {
  distancia_metros: string;
  minutos: string;
  segundos: string;
}

export default function FormularioSesion({ metaId }: { metaId: string }) {
  const supabase = createClient();

  const [tipo, setTipo] = useState<TipoTirada>("easy");
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10));
  const [kmTotales, setKmTotales] = useState("");
  const [kmZ2, setKmZ2] = useState("");
  const [horas, setHoras] = useState("");
  const [minutos, setMinutos] = useState("");
  const [ppm, setPpm] = useState("");
  const [series, setSeries] = useState<Serie[]>([]);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);

  function addSerie() {
    setSeries([...series, { distancia_metros: "", minutos: "", segundos: "" }]);
  }

  function updateSerie(i: number, campo: keyof Serie, valor: string) {
    const copia = [...series];
    copia[i][campo] = valor;
    setSeries(copia);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setGuardando(true);
    setMensaje(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setMensaje("Tienes que iniciar sesión.");
      setGuardando(false);
      return;
    }

    const tiempoTotalSegundos =
      (parseInt(horas || "0") * 3600) + (parseInt(minutos || "0") * 60);

    const { data: sesion, error } = await supabase
      .from("sesiones")
      .insert({
        usuario_id: user.id,
        meta_id: metaId,
        fecha,
        tipo_tirada: tipo,
        km_totales: parseFloat(kmTotales),
        km_z2: parseFloat(kmZ2 || "0"),
        tiempo_total_segundos: tiempoTotalSegundos,
        ppm_medio: ppm ? parseInt(ppm) : null,
      })
      .select()
      .single();

    if (error) {
      setMensaje(`Error: ${error.message}`);
      setGuardando(false);
      return;
    }

    if (tipo === "calidad" && series.length > 0) {
      const filas = series.map((s, i) => ({
        sesion_id: sesion.id,
        numero_serie: i + 1,
        distancia_metros: parseInt(s.distancia_metros),
        ritmo_segundos_km: Math.round(
          ((parseInt(s.minutos || "0") * 60 + parseInt(s.segundos || "0")) /
            (parseInt(s.distancia_metros) / 1000))
        ),
      }));
      await supabase.from("series_calidad").insert(filas);
    }

    setMensaje("Sesión guardada ✅");
    setGuardando(false);
    setKmTotales("");
    setKmZ2("");
    setHoras("");
    setMinutos("");
    setPpm("");
    setSeries([]);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 bg-white rounded-xl border border-neutral-200 p-5">
      <h2 className="font-semibold text-lg">Nueva sesión</h2>

      <div className="grid grid-cols-2 gap-3">
        <label className="text-sm">
          Fecha
          <input
            type="date"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            className="w-full border rounded-lg px-2 py-1 mt-1"
          />
        </label>
        <label className="text-sm">
          Tipo de tirada
          <select
            value={tipo}
            onChange={(e) => setTipo(e.target.value as TipoTirada)}
            className="w-full border rounded-lg px-2 py-1 mt-1"
          >
            <option value="easy">Easy</option>
            <option value="calidad">Calidad</option>
            <option value="long">Long</option>
            <option value="regenerativo">Regenerativo</option>
          </select>
        </label>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <label className="text-sm">
          Km totales
          <input
            type="number"
            step="0.01"
            required
            value={kmTotales}
            onChange={(e) => setKmTotales(e.target.value)}
            className="w-full border rounded-lg px-2 py-1 mt-1"
          />
        </label>
        <label className="text-sm">
          Km en Z2
          <input
            type="number"
            step="0.01"
            value={kmZ2}
            onChange={(e) => setKmZ2(e.target.value)}
            className="w-full border rounded-lg px-2 py-1 mt-1"
          />
        </label>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <label className="text-sm">
          Horas
          <input
            type="number"
            value={horas}
            onChange={(e) => setHoras(e.target.value)}
            className="w-full border rounded-lg px-2 py-1 mt-1"
          />
        </label>
        <label className="text-sm">
          Minutos
          <input
            type="number"
            value={minutos}
            onChange={(e) => setMinutos(e.target.value)}
            className="w-full border rounded-lg px-2 py-1 mt-1"
          />
        </label>
        <label className="text-sm">
          PPM medio
          <input
            type="number"
            value={ppm}
            onChange={(e) => setPpm(e.target.value)}
            className="w-full border rounded-lg px-2 py-1 mt-1"
          />
        </label>
      </div>

      {tipo === "calidad" && (
        <div className="border-t pt-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Series</span>
            <button
              type="button"
              onClick={addSerie}
              className="text-sm text-blue-600"
            >
              + Añadir serie
            </button>
          </div>
          {series.map((s, i) => (
            <div key={i} className="grid grid-cols-3 gap-2">
              <input
                placeholder="Distancia (m)"
                type="number"
                value={s.distancia_metros}
                onChange={(e) => updateSerie(i, "distancia_metros", e.target.value)}
                className="border rounded-lg px-2 py-1 text-sm"
              />
              <input
                placeholder="Min"
                type="number"
                value={s.minutos}
                onChange={(e) => updateSerie(i, "minutos", e.target.value)}
                className="border rounded-lg px-2 py-1 text-sm"
              />
              <input
                placeholder="Seg"
                type="number"
                value={s.segundos}
                onChange={(e) => updateSerie(i, "segundos", e.target.value)}
                className="border rounded-lg px-2 py-1 text-sm"
              />
            </div>
          ))}
        </div>
      )}

      <button
        type="submit"
        disabled={guardando}
        className="w-full bg-neutral-900 text-white rounded-lg py-2 font-medium disabled:opacity-50"
      >
        {guardando ? "Guardando..." : "Guardar sesión"}
      </button>

      {mensaje && <p className="text-sm text-center">{mensaje}</p>}
    </form>
  );
}
