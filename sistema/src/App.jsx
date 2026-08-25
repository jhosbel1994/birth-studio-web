import { useState, lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Login, { isLoggedIn } from './pages/Login'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Cotizador from './pages/Cotizador'
import Clientes from './pages/Clientes'
import Cotizaciones from './pages/Cotizaciones'
import Contratos from './pages/Contratos'
import Gastos from './pages/Gastos'
import Inventario from './pages/Inventario'
import Proveedores from './pages/Proveedores'
import Galeria from './pages/Galeria'
import MockupVitrina from './modules/mockup-superficies'

// three.js es pesado: la página de Prototipo se carga solo cuando se abre.
const Prototipo = lazy(() => import('./pages/Prototipo'))

function CargandoPagina() {
  return (
    <div className="flex items-center justify-center min-h-[60vh] text-birth-gray-3 font-dm text-sm">
      Cargando prototipo 3D…
    </div>
  )
}

export default function App() {
  const [logged, setLogged] = useState(isLoggedIn)

  if (!logged) {
    return <Login onLogin={() => setLogged(true)} />
  }

  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="cotizador" element={<Cotizador />} />
        <Route path="clientes" element={<Clientes />} />
        <Route path="cotizaciones" element={<Cotizaciones />} />
        <Route path="contratos" element={<Contratos />} />
        <Route path="gastos" element={<Gastos />} />
        <Route path="inventario" element={<Inventario />} />
        <Route path="proveedores" element={<Proveedores />} />
        <Route path="galeria" element={<Galeria />} />
        <Route path="mockup-vitrina" element={<MockupVitrina />} />
        <Route path="prototipo" element={
          <Suspense fallback={<CargandoPagina />}>
            <Prototipo />
          </Suspense>
        } />
      </Route>
    </Routes>
  )
}
