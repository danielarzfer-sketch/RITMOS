import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Rumbo a la meta",
  description: "Seguimiento de entrenamientos hacia tu media maratón",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className="bg-neutral-50 min-h-screen">{children}</body>
    </html>
  );
}
