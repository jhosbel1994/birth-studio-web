import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, Calculator, Users, FileText, ScrollText, Wallet, Image, Box,
  Menu, X, LogOut, KeyRound,
} from 'lucide-react'
import { doLogout, ModalCambiarPin } from '../pages/Login'

const NAV = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Inicio' },
  { to: '/cotizador', icon: Calculator, label: 'Cotizador' },
  { to: '/clientes', icon: Users, label: 'Clientes' },
  { to: '/cotizaciones', icon: FileText, label: 'Cotizaciones' },
  { to: '/contratos', icon: ScrollText, label: 'Contratos' },
  { to: '/gastos', icon: Wallet, label: 'Finanzas' },
  { to: '/galeria', icon: Image, label: 'Galería' },
  { to: '/prototipo', icon: Box, label: 'Prototipo Logo' },
]

export default function MobileHeader() {
  const [open, setOpen] = useState(false)
  const [modalPin, setModalPin] = useState(false)

  const handleLogout = () => {
    if (!confirm('¿Cerrar sesión?')) return
    doLogout()
    window.location.reload()
  }

  return (
    <>
      {modalPin && <ModalCambiarPin onClose={() => setModalPin(false)} />}

      <header
        className="mobile-app-header sticky top-0 z-50 border-b border-white/40 bg-white/40 backdrop-blur-[40px] shadow-sm lg:hidden"
        style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
      >
        <div className="flex h-14 items-center justify-between px-4">
          <img
            src="/cotizador/logo-birth-dark.png"
            alt="Birth Studio"
            className="h-8 w-auto object-contain"
          />
          <button
            type="button"
            onClick={() => setOpen(v => !v)}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/50 border border-white/60 text-on-surface active:bg-primary active:text-white"
            aria-label={open ? 'Cerrar menú' : 'Abrir menú'}
            aria-expanded={open}
          >
            {open ? <X size={20} /> : <Menu size={21} />}
          </button>
        </div>

        {open && (
          <div className="border-t border-white/40 bg-white/60 backdrop-blur-[40px] px-3 pb-3 widget-shadow">
            <nav className="grid grid-cols-2 gap-2 py-3">
              {NAV.map(({ to, icon: Icon, label }) => (
                <NavLink
                  key={to}
                  to={to}
                  onClick={() => setOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-2 rounded-full border px-3 py-3 text-sm font-dm font-medium ${
                      isActive
                        ? 'border-transparent bg-secondary-container/80 text-on-secondary-container'
                        : 'border-white/60 bg-white/50 text-on-surface-variant'
                    }`
                  }
                >
                  <Icon size={17} strokeWidth={2} />
                  <span className="truncate">{label}</span>
                </NavLink>
              ))}
            </nav>

            <div className="grid grid-cols-2 gap-2 border-t border-white/40 pt-3">
              <button
                type="button"
                onClick={() => { setOpen(false); setModalPin(true) }}
                className="flex items-center justify-center gap-2 rounded-full border border-white/60 bg-white/50 px-3 py-2.5 text-xs font-dm text-on-surface-variant"
              >
                <KeyRound size={15} />
                Clave
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="flex items-center justify-center gap-2 rounded-full border border-white/60 bg-white/50 px-3 py-2.5 text-xs font-dm text-primary"
              >
                <LogOut size={15} />
                Salir
              </button>
            </div>
          </div>
        )}
      </header>
    </>
  )
}
