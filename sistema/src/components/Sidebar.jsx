import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, Calculator, Users,
  FileText, ScrollText, Wallet, Image, Box,
  LogOut, KeyRound,
} from 'lucide-react'
import { doLogout, ModalCambiarPin } from '../pages/Login'

const NAV = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/cotizador', icon: Calculator, label: 'Cotizador' },
  { to: '/clientes', icon: Users, label: 'Clientes' },
  { to: '/cotizaciones', icon: FileText, label: 'Cotizaciones' },
  { to: '/contratos', icon: ScrollText, label: 'Contratos' },
  { to: '/gastos', icon: Wallet, label: 'Gastos & Finanzas' },
  { to: '/galeria', icon: Image, label: 'Galería' },
  { to: '/prototipo', icon: Box, label: 'Prototipo Logo' },
]

export default function Sidebar() {
  const [modalPin, setModalPin] = useState(false)

  const handleLogout = () => {
    if (!confirm('¿Cerrar sesión?')) return
    doLogout()
    window.location.reload()
  }

  return (
    <>
      {modalPin && <ModalCambiarPin onClose={() => setModalPin(false)} />}

      <aside className="w-56 h-[calc(100vh-1.5rem)] bg-black/70 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-glass-dark flex flex-col fixed left-3 top-3 z-30">
        {/* Logo */}
        <div className="px-5 py-5 border-b border-white/10">
          <img
            src="/cotizador/logo-birth.png"
            alt="Birth Studio"
            className="h-10 w-auto object-contain"
          />
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {NAV.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-dm transition-all duration-150 ${
                  isActive
                    ? 'bg-birth-red/90 text-white font-medium shadow-glow'
                    : 'text-white/45 hover:text-white hover:bg-white/10'
                }`
              }
            >
              <Icon size={16} strokeWidth={1.75} />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Footer — acciones */}
        <div className="px-3 py-4 border-t border-white/10 space-y-0.5">
          <button
            onClick={() => setModalPin(true)}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-dm text-white/30 hover:text-white/70 hover:bg-white/10 transition-all"
          >
            <KeyRound size={15} strokeWidth={1.75} />
            Cambiar clave
          </button>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-dm text-white/30 hover:text-white/70 hover:bg-white/10 transition-all"
          >
            <LogOut size={15} strokeWidth={1.75} />
            Cerrar sesión
          </button>
          <p className="text-white/15 text-xs font-dm px-3 pt-2 leading-relaxed">
            Birth Studio SpA
            <br />
            Talca, Chile
          </p>
        </div>
      </aside>
    </>
  )
}
