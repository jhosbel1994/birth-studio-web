import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, Calculator, Users, FileText, ScrollText, Wallet, Boxes, Truck, Image, Box, Frame,
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
  { to: '/inventario', icon: Boxes, label: 'Inventario' },
  { to: '/proveedores', icon: Truck, label: 'Proveedores' },
  { to: '/galeria', icon: Image, label: 'Galería' },
  { to: '/prototipo', icon: Box, label: 'Prototipo Logo' },
  { to: '/mockup-vitrina', icon: Frame, label: 'Mockup Vitrina' },
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
            onClick={() => setOpen(true)}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/50 border border-white/60 text-on-surface active:bg-primary active:text-white"
            aria-label="Abrir menú"
            aria-expanded={open}
          >
            <Menu size={21} />
          </button>
        </div>
      </header>

      {/* Menú lateral: panel opaco por ENCIMA de todo (no lo tapa nada). */}
      {open && (
        <div className="fixed inset-0 z-[100] lg:hidden" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div
            className="absolute right-0 top-0 flex h-full w-[82%] max-w-xs flex-col bg-white shadow-2xl"
            style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
          >
            <div className="flex h-14 items-center justify-between border-b border-black/10 px-4 shrink-0">
              <img src="/cotizador/logo-birth-dark.png" alt="Birth Studio" className="h-8 w-auto object-contain" />
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-black/10 text-on-surface active:bg-primary active:text-white"
                aria-label="Cerrar menú"
              >
                <X size={20} />
              </button>
            </div>

            <nav className="flex-1 overflow-y-auto p-3 space-y-1">
              {NAV.map(({ to, icon: Icon, label }) => (
                <NavLink
                  key={to}
                  to={to}
                  onClick={() => setOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-dm ${
                      isActive
                        ? 'bg-primary/10 text-on-surface font-semibold'
                        : 'text-on-surface-variant hover:bg-black/5'
                    }`
                  }
                >
                  <Icon size={18} strokeWidth={2} />
                  <span className="truncate">{label}</span>
                </NavLink>
              ))}
            </nav>

            <div
              className="grid grid-cols-2 gap-2 border-t border-black/10 p-3 shrink-0"
              style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 0.75rem)' }}
            >
              <button
                type="button"
                onClick={() => { setOpen(false); setModalPin(true) }}
                className="flex items-center justify-center gap-2 rounded-full border border-black/10 bg-white px-3 py-2.5 text-xs font-dm text-on-surface-variant active:bg-black/5"
              >
                <KeyRound size={15} />
                Clave
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="flex items-center justify-center gap-2 rounded-full border border-black/10 bg-white px-3 py-2.5 text-xs font-dm text-primary active:bg-red-50"
              >
                <LogOut size={15} />
                Salir
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
