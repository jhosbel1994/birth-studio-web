import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import BottomNav from './BottomNav'
import MobileHeader from './MobileHeader'

export default function Layout() {
  return (
    <div className="app-shell min-h-screen bg-birth-gray">
      <div className="desktop-sidebar">
        <Sidebar />
      </div>

      <MobileHeader />

      <main className="app-main min-h-screen overflow-auto pb-16 lg:pb-0">
        <Outlet />
      </main>

      <BottomNav />
    </div>
  )
}
