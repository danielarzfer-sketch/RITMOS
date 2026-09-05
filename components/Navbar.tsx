'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function Navbar() {
  const pathname = usePathname()

  const links = [
    { name: 'Panel Principal', href: '/' },
    { name: 'Historial', href: '/entrenamientos' },
    { name: 'Evolución y Gráficas', href: '/graficas' },
    { name: 'Mi Perfil', href: '/perfil' },
  ]

  return (
    <nav className="border-b border-neutral-200 bg-white mb-6 sticky top-0 z-50">
      <div className="max-w-3xl mx-auto px-4 flex justify-between items-center">
        <div className="py-3 font-bold text-neutral-900 tracking-tight">⚡ Control de Ritmos</div>
        <div className="flex space-x-4 overflow-x-auto py-2">
          {links.map((link) => {
            const isActive = pathname === link.href
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`py-1.5 px-3 text-sm font-medium rounded-lg transition-colors ${
                  isActive
                    ? 'bg-black text-white'
                    : 'text-neutral-600 hover:bg-neutral-100'
                }`}
              >
                {link.name}
              </Link>
            )
          })}
        </div>
      </div>
    </nav>
  )
}