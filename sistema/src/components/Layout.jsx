import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'

export default function Layout() {
  return (
    <div className="flex min-h-screen bg-birth-gray">
      <Sidebar />
      <main className="ml-56 flex-1 min-h-screen overflow-auto">
        <Outlet />
      </main>
    </div>
  )
}
