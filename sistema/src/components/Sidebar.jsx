import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, Calculator, Users,
  FileText, ScrollText, Wallet, Boxes, Truck, Image, Box, Frame,
  LogOut, KeyRound, ChevronLeft, ChevronRight,
} from 'lucide-react'
import { doLogout, ModalCambiarPin } from '../pages/Login'

const NAV = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/cotizador', icon: Calculator, label: 'Cotizador' },
  { to: '/clientes', icon: Users, label: 'Clientes' },
  { to: '/cotizaciones', icon: FileText, label: 'Cotizaciones' },
  { to: '/contratos', icon: ScrollText, label: 'Contratos' },
  { to: '/gastos', icon: Wallet, label: 'Gastos & Finanzas' },
  { to: '/inventario', icon: Boxes, label: 'Inventario' },
  { to: '/proveedores', icon: Truck, label: 'Proveedores' },
  { to: '/galeria', icon: Image, label: 'Galería' },
  { to: '/prototipo', icon: Box, label: 'Prototipo Logo' },
  { to: '/mockup-vitrina', icon: Frame, label: 'Mockup Vitrina' },
]

// `collapsed` reduce el menú a un riel de solo íconos para ganar espacio en
// pantalla (útil sobre todo en Prototipo y Mockup de vidrio). `onToggle` lo
// abre/cierra; la elección se recuerda desde Layout.
export default function Sidebar({ collapsed = false, onToggle }) {
  const [modalPin, setModalPin] = useState(false)

  const handleLogout = () => {
    if (!confirm('¿Cerrar sesión?')) return
    doLogout()
    window.location.reload()
  }

  const itemBase = 'flex items-center py-3 mx-2 rounded-full text-sm font-dm transition-all duration-300'

  return (
    <>
      {modalPin && <ModalCambiarPin onClose={() => setModalPin(false)} />}

      <aside className={`${collapsed ? 'w-[4.75rem]' : 'w-72'} h-full glass-sidebar rounded-r-widget flex flex-col fixed left-0 top-0 z-30 transition-all duration-300`}>
        {/* Botón contraer / expandir */}
        <button
          onClick={onToggle}
          title={collapsed ? 'Expandir menú' : 'Contraer menú'}
          aria-label={collapsed ? 'Expandir menú' : 'Contraer menú'}
          className="absolute top-4 -right-3 w-6 h-6 rounded-full bg-white/85 border border-white/70 shadow-md flex items-center justify-center text-on-surface-variant hover:text-primary z-40"
        >
          {collapsed ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
        </button>

        {/* Logo */}
        <div className={`${collapsed ? 'px-2 py-5' : 'px-gutter py-8'} flex flex-col items-center text-center`}>
          <img
            src="/cotizador/logo-birth-dark.png"
            alt="Birth Studio"
            className={`${collapsed ? 'h-8' : 'h-12 mb-3'} w-auto object-contain`}
          />
          {!collapsed && <p className="font-dm text-[11px] text-on-surface-variant uppercase tracking-wider">Sistema interno</p>}
        </div>

        {/* Nav */}
        <nav className={`flex-1 ${collapsed ? 'px-1' : 'px-4'} space-y-1 overflow-y-auto`}>
          {NAV.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              title={collapsed ? label : undefined}
              className={({ isActive }) =>
                `${itemBase} ${collapsed ? 'justify-center px-0' : 'gap-3 px-4 hover:translate-x-1'} ${
                  isActive
                    ? 'bg-secondary-container/80 text-on-secondary-container font-semibold'
                    : 'text-on-surface-variant hover:bg-white/40'
                }`
              }
            >
              <Icon size={17} strokeWidth={1.75} />
              {!collapsed && label}
            </NavLink>
          ))}
        </nav>

        {/* Footer — acciones */}
        <div className={`${collapsed ? 'px-1' : 'px-4'} py-6 mt-auto space-y-1`}>
          <button
            onClick={() => setModalPin(true)}
            title={collapsed ? 'Cambiar clave' : undefined}
            className={`${itemBase} w-full text-on-surface-variant hover:bg-white/40 ${collapsed ? 'justify-center px-0' : 'gap-3 px-4 hover:translate-x-1'}`}
            style={collapsed ? undefined : { width: 'calc(100% - 1rem)' }}
          >
            <KeyRound size={16} strokeWidth={1.75} />
            {!collapsed && 'Cambiar clave'}
          </button>
          <button
            onClick={handleLogout}
            title={collapsed ? 'Cerrar sesión' : undefined}
            className={`${itemBase} w-full text-primary hover:bg-white/40 ${collapsed ? 'justify-center px-0' : 'gap-3 px-4 hover:translate-x-1'}`}
            style={collapsed ? undefined : { width: 'calc(100% - 1rem)' }}
          >
            <LogOut size={16} strokeWidth={1.75} />
            {!collapsed && 'Cerrar sesión'}
          </button>
          {!collapsed && (
            <p className="text-on-surface-variant/50 text-xs font-dm px-6 pt-3 leading-relaxed">
              Birth Studio SpA
              <br />
              Talca, Chile
            </p>
          )}
        </div>
      </aside>
    </>
  )
}
