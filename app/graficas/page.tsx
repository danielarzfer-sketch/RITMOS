'use client'

import Navbar from "@/components/Navbar";

export default function GraficasPage() {
  return (
    <div className="min-h-screen bg-neutral-50 pb-12">
      <Navbar />
      <main className="max-w-xl mx-auto px-4 space-y-4">
        <h1 className="text-2xl font-bold text-neutral-900">Evolución de Ritmos y Predicciones</h1>
        <div className="bg-white p-6 rounded-xl border border-neutral-200 shadow-sm space-y-4">
          <p className="text-sm text-neutral-600">Aquí se mostrarán las gráficas evolutivas de tus ritmos medios y las proyecciones futuras calculadas en función de tus entrenamientos recientes.</p>
          <div className="h-48 bg-neutral-100 rounded-lg flex items-center justify-center text-neutral-400 text-sm">
            Gráfica de Rendimiento y Predicciones
          </div>
        </div>
      </main>
    </div>
  );
}