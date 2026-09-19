import { Outlet } from 'react-router-dom'
import { useEffect, useState } from 'react'
import Sidebar from './Sidebar'
import BottomNav from './BottomNav'
import MobileHeader from './MobileHeader'

export default function Layout() {
  // Menú del sistema colapsable a íconos: da más ancho al Prototipo y al
  // Mockup de vidrio. Se recuerda la elección entre sesiones.
  const [navCollapsed, setNavCollapsed] = useState(() => {
    try { return localStorage.getItem('bs_nav_collapsed') === '1' } catch { return false }
  })
  useEffect(() => {
    try { localStorage.setItem('bs_nav_collapsed', navCollapsed ? '1' : '0') } catch { /* sin storage */ }
  }, [navCollapsed])

  return (
    <div className={`app-shell min-h-screen${navCollapsed ? ' nav-collapsed' : ''}`}>
      <div className="desktop-sidebar">
        <Sidebar collapsed={navCollapsed} onToggle={() => setNavCollapsed((v) => !v)} />
      </div>

      <MobileHeader />

      <main className="app-main min-h-screen overflow-auto pb-16 lg:pb-0">
        <Outlet />
      </main>

      <BottomNav />
    </div>
  )
}
