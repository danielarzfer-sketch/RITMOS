'use client'

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Navbar from "@/components/Navbar";

export default function HistorialPage() {
  const [entrenamientos, setEntrenamientos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function loadEntrenamientos() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("trainings")
        .select("*")
        .eq("usuario_id", user.id)
        .order("fecha", { ascending: false });

      if (data) setEntrenamientos(data);
      setLoading(false);
    }
    loadEntrenamientos();
  }, [supabase]);

  return (
    <div className="min-h-screen bg-neutral-50 pb-12">
      <Navbar />
      <main className="max-w-xl mx-auto px-4 space-y-4">
        <h1 className="text-2xl font-bold text-neutral-900">Historial de Entrenamientos</h1>
        {loading ? (
          <p className="text-neutral-500">Cargando entrenamientos...</p>
        ) : entrenamientos.length === 0 ? (
          <p className="text-neutral-500 bg-white p-4 rounded-xl border">No hay entrenamientos registrados todavía.</p>
        ) : (
          <div className="space-y-3">
            {entrenamientos.map((t) => (
              <div key={t.id} className="bg-white p-4 rounded-xl border border-neutral-200 shadow-sm flex justify-between items-center">
                <div>
                  <p className="text-xs text-neutral-400">{t.fecha}</p>
                  <p className="font-semibold text-neutral-800">{t.tipo_tirada || "Entrenamiento"} - {t.km_totales} km</p>
                </div>
                <div className="text-right text-sm">
                  <p className="font-medium">{t.ppm_medio ? `${t.ppm_medio} ppm` : ""}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}