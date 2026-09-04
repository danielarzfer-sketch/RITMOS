// Tipos que reflejan supabase/schema.sql
// (más adelante se pueden generar automáticamente con supabase gen types)

export type TipoTirada = "easy" | "calidad" | "long" | "regenerativo";

export interface Meta {
  id: string;
  usuario_id: string;
  nombre: string;
  fecha_objetivo: string;
  activa: boolean;
  created_at: string;
}

export interface Sesion {
  id: string;
  usuario_id: string;
  meta_id: string | null;
  fecha: string;
  tipo_tirada: TipoTirada;
  km_totales: number;
  km_z2: number;
  tiempo_total_segundos: number;
  ppm_medio: number | null;
  created_at: string;
}

export interface SerieCalidad {
  id: string;
  sesion_id: string;
  numero_serie: number;
  distancia_metros: number;
  ritmo_segundos_km: number;
}

// Fila de la vista v_sesion_calculada
export interface SesionCalculada {
  id: string;
  usuario_id: string;
  meta_id: string | null;
  fecha: string;
  tipo_tirada: TipoTirada;
  km_totales: number;
  km_z2: number;
  tiempo_total_segundos: number;
  ppm_medio: number | null;
  ritmo_medio_seg_km: number;
  km_calidad: number;
  ritmo_calidad_seg_km: number | null;
}

// Fila de la vista v_semana_calculada
export interface SemanaCalculada {
  usuario_id: string;
  meta_id: string | null;
  semana_inicio: string;
  km_totales_semana: number;
  km_z2_semana: number;
  km_calidad_semana: number;
  pct_z2_semana: number;
  pct_calidad_semana: number;
}

export interface RitmoSugerido {
  id: string;
  usuario_id: string;
  meta_id: string;
  semana_inicio: string;
  ritmo_easy_seg_km: number | null;
  ritmo_calidad_seg_km: number | null;
  ritmo_long_seg_km: number | null;
  ritmo_regenerativo_seg_km: number | null;
  justificacion: string | null;
  aceptado: boolean | null;
  created_at: string;
}

// Helper: formatea segundos/km a "m:ss /km"
export function formatRitmo(segundosKm: number | null): string {
  if (segundosKm == null) return "—";
  const min = Math.floor(segundosKm / 60);
  const seg = Math.round(segundosKm % 60);
  return `${min}:${seg.toString().padStart(2, "0")} /km`;
}
