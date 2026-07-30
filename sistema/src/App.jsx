import { useState } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Login, { isLoggedIn } from './pages/Login'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Cotizador from './pages/Cotizador'
import Clientes from './pages/Clientes'
import Cotizaciones from './pages/Cotizaciones'
import Contratos from './pages/Contratos'
import Gastos from './pages/Gastos'
import Galeria from './pages/Galeria'

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
        <Route path="galeria" element={<Galeria />} />
      </Route>
    </Routes>
  )
}
