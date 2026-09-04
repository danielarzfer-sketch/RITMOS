"use client";

import { differenceInCalendarDays } from "date-fns";

interface Props {
  fechaObjetivo: string; // "2026-11-29"
  fechaInicio: string; // fecha en la que empezaste a preparar la carrera
  nombreMeta: string;
}

// Cuenta atrás: es matemáticamente una línea recta (baja 1 día por día),
// así que la "gráfica" es solo una barra de progreso + el número de días.
export default function CuentaAtras({
  fechaObjetivo,
  fechaInicio,
  nombreMeta,
}: Props) {
  const hoy = new Date();
  const diasRestantes = differenceInCalendarDays(
    new Date(fechaObjetivo),
    hoy
  );
  const diasTotales = differenceInCalendarDays(
    new Date(fechaObjetivo),
    new Date(fechaInicio)
  );
  const diasTranscurridos = diasTotales - diasRestantes;
  const progreso = Math.min(
    100,
    Math.max(0, (diasTranscurridos / diasTotales) * 100)
  );

  return (
    <div className="bg-white rounded-xl border border-neutral-200 p-5">
      <div className="flex items-baseline justify-between mb-2">
        <span className="text-neutral-500 text-sm">{nombreMeta}</span>
        <span className="text-3xl font-bold">
          {diasRestantes} <span className="text-base font-normal text-neutral-500">días</span>
        </span>
      </div>
      <div className="w-full h-2 bg-neutral-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-neutral-900 rounded-full transition-all"
          style={{ width: `${progreso}%` }}
        />
      </div>
      <p className="text-xs text-neutral-400 mt-2">
        Meta: {new Date(fechaObjetivo).toLocaleDateString("es-ES", {
          day: "numeric",
          month: "long",
          year: "numeric",
        })}
      </p>
    </div>
  );
}
