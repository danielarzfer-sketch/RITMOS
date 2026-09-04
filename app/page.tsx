import { createClient } from "@/lib/supabase/server";
import CuentaAtras from "@/components/CuentaAtras";
import FormularioSesion from "@/components/FormularioSesion";
import type { Meta, SemanaCalculada } from "@/types/database";

export default async function DashboardPage() {
  const supabase = await createClient();

  // Cargamos la meta activa (si existe en la BD)
  const { data: meta } = await supabase
    .from("metas")
    .select("*")
    .eq("activa", true)
    .limit(1)
    .maybeSingle<Meta>();

  // Cargamos la semana actual
  const { data: semanaActual } = await supabase
    .from("v_semana_calculada")
    .select("*")
    .order("semana_inicio", { ascending: false })
    .limit(1)
    .maybeSingle<SemanaCalculada>();

  return (
    <main className="max-w-xl mx-auto px-4 py-8 space-y-6">
      <h1 className="text-2xl font-bold">Rumbo a la meta</h1>

      {meta ? (
        <CuentaAtras
          fechaObjetivo={meta.fecha_objetivo}
          fechaInicio={meta.created_at}
          nombreMeta={meta.nombre}
        />
      ) : (
        /* Cuenta atrás por defecto al 29 de noviembre si aún no hay meta en la BD */
        <CuentaAtras
          fechaObjetivo="2026-11-29"
          fechaInicio="2026-09-01"
          nombreMeta="Meta 29 de Noviembre"
        />
      )}

      {semanaActual && (
        <div className="bg-white rounded-xl border border-neutral-200 p-5 grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-neutral-400">Km totales semana</p>
            <p className="text-lg font-semibold">
              {semanaActual.km_totales_semana} km
            </p>
          </div>
          <div>
            <p className="text-neutral-400">Km calidad semana</p>
            <p className="text-lg font-semibold">
              {semanaActual.km_calidad_semana} km
            </p>
          </div>
          <div>
            <p className="text-neutral-400">% Z2 semana</p>
            <p className="text-lg font-semibold">
              {semanaActual.pct_z2_semana}%
            </p>
          </div>
          <div>
            <p className="text-neutral-400">% calidad semana</p>
            <p className="text-lg font-semibold">
              {semanaActual.pct_calidad_semana}%
            </p>
          </div>
        </div>
      )}

      <FormularioSesion metaId={meta?.id || "default-meta"} />
    </main>
  );
}