import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import CuentaAtras from "@/components/CuentaAtras";
import FormularioSesion from "@/components/FormularioSesion";
import type { Meta, SemanaCalculada } from "@/types/database";

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: meta } = await supabase
    .from("metas")
    .select("*")
    .eq("usuario_id", user.id)
    .eq("activa", true)
    .maybeSingle<Meta>();

  const { data: semanaActual } = await supabase
    .from("v_semana_calculada")
    .select("*")
    .eq("usuario_id", user.id)
    .order("semana_inicio", { ascending: false })
    .limit(1)
    .maybeSingle<SemanaCalculada>();

  return (
    <main className="max-w-xl mx-auto px-4 py-8 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Rumbo a la meta</h1>
        <form action="/auth/signout" method="post">
          <button className="text-xs text-neutral-500 hover:text-black border px-3 py-1.5 rounded-lg">
            Cerrar sesión
          </button>
        </form>
      </div>

      {meta ? (
        <CuentaAtras
          fechaObjetivo={meta.fecha_objetivo}
          fechaInicio={meta.created_at}
          nombreMeta={meta.nombre}
        />
      ) : (
        <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl text-sm text-amber-800">
          <p className="font-semibold mb-1">No tienes ninguna meta activa</p>
          <p>Crea una en tu base de datos vinculada a tu usuario (usuario_id: {user.id}) para ver tu cuenta atrás personalizada.</p>
        </div>
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