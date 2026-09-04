import { createClient } from "@/lib/supabase/server";
import CuentaAtras from "@/components/CuentaAtras";
import FormularioSesion from "@/components/FormularioSesion";
import type { Meta, SemanaCalculada } from "@/types/database";

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <main className="max-w-xl mx-auto px-4 py-8">
        <p>Tienes que iniciar sesión para ver tu progreso.</p>
        {/* TODO: pantalla de login con Supabase Auth */}
      </main>
    );
  }

  const { data: meta } = await supabase
    .from("metas")
    .select("*")
    .eq("usuario_id", user.id)
    .eq("activa", true)
    .single<Meta>();

  const { data: semanaActual } = await supabase
    .from("v_semana_calculada")
    .select("*")
    .eq("usuario_id", user.id)
    .order("semana_inicio", { ascending: false })
    .limit(1)
    .maybeSingle<SemanaCalculada>();

  return (
    <main className="max-w-xl mx-auto px-4 py-8 space-y-6">
      <h1 className="text-2xl font-bold">Rumbo a la meta</h1>

      {meta && (
        <CuentaAtras
          fechaObjetivo={meta.fecha_objetivo}
          fechaInicio={meta.created_at}
          nombreMeta={meta.nombre}
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

      {meta && <FormularioSesion metaId={meta.id} />}
    </main>
  );
}
