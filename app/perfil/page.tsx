'use client'

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Navbar from "@/components/Navbar";

export default function PerfilPage() {
  const [edad, setEdad] = useState("");
  const [peso, setPeso] = useState("");
  const [estatura, setEstatura] = useState("");
  const [consideraciones, setConsideraciones] = useState("");
  const [mensaje, setMensaje] = useState("");
  const supabase = createClient();

  useEffect(() => {
    async function loadPerfil() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase.from("perfiles").select("*").eq("usuario_id", user.id).maybeSingle();
      if (data) {
        setEdad(data.edad || "");
        setPeso(data.peso || "");
        setEstatura(data.estatura || "");
        setConsideraciones(data.consideraciones || "");
      }
    }
    loadPerfil();
  }, [supabase]);

  const handleGuardar = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from("perfiles").upsert({
      usuario_id: user.id,
      edad: edad ? Number(edad) : null,
      peso: peso ? Number(peso) : null,
      estatura: estatura ? Number(estatura) : null,
      consideraciones,
    }, { onConflict: "usuario_id" });

    if (!error) setMensaje("¡Perfil actualizado correctamente para la IA!");
    else setMensaje("Error al guardar el perfil.");
  };

  return (
    <div className="min-h-screen bg-neutral-50 pb-12">
      <Navbar />
      <main className="max-w-xl mx-auto px-4 space-y-4">
        <h1 className="text-2xl font-bold text-neutral-900">Perfil del Corredor</h1>
        <p className="text-sm text-neutral-600">Estos datos son fundamentales para que Gemini ajuste con precisión tus zonas y ritmos de entrenamiento.</p>

        {mensaje && <div className="p-3 bg-green-50 text-green-700 text-sm rounded-lg">{mensaje}</div>}

        <form onSubmit={handleGuardar} className="bg-white p-6 rounded-xl border border-neutral-200 shadow-sm space-y-4">
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">Edad (años)</label>
            <input type="number" value={edad} onChange={(e) => setEdad(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">Peso (kg)</label>
            <input type="number" step="0.1" value={peso} onChange={(e) => setPeso(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">Estatura (cm)</label>
            <input type="number" value={estatura} onChange={(e) => setEstatura(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">Consideraciones especiales (lesiones, pulsaciones máximas, experiencia)</label>
            <textarea value={consideraciones} onChange={(e) => setConsideraciones(e.target.value)} rows={3} className="w-full px-3 py-2 border rounded-lg text-sm" />
          </div>
          <button type="submit" className="w-full bg-black text-white py-2.5 rounded-lg font-medium text-sm">Guardar Perfil</button>
        </form>
      </main>
    </div>
  );
}