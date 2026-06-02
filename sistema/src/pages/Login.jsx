import { useState } from 'react'
import { Eye, EyeOff, Lock } from 'lucide-react'

const DEFAULT_PIN = '2025'
const STORAGE_KEY = 'BIRTH_PIN'
const SESSION_KEY = 'BIRTH_LOGGED_IN'

export function getPin() {
  return localStorage.getItem(STORAGE_KEY) || DEFAULT_PIN
}

export function setPin(nuevoPin) {
  localStorage.setItem(STORAGE_KEY, nuevoPin)
}

export function isLoggedIn() {
  return sessionStorage.getItem(SESSION_KEY) === '1'
}

export function doLogin() {
  sessionStorage.setItem(SESSION_KEY, '1')
}

export function doLogout() {
  sessionStorage.removeItem(SESSION_KEY)
}

// Modal para cambiar PIN (usado desde la sidebar)
export function ModalCambiarPin({ onClose }) {
  const [actual, setActual] = useState('')
  const [nueva, setNueva] = useState('')
  const [confirmar, setConfirmar] = useState('')
  const [error, setError] = useState('')
  const [ok, setOk] = useState(false)

  const handleSubmit = (e) => {
    e.preventDefault()
    if (actual !== getPin()) { setError('La clave actual es incorrecta'); return }
    if (nueva.length < 4) { setError('La nueva clave debe tener al menos 4 caracteres'); return }
    if (nueva !== confirmar) { setError('Las claves no coinciden'); return }
    setPin(nueva)
    setOk(true)
    setError('')
    setTimeout(() => onClose(), 1500)
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded w-full max-w-sm shadow-xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-birth-gray-2">
          <h2 className="font-barlow text-xl font-bold tracking-wide">CAMBIAR CLAVE</h2>
          <button onClick={onClose} className="text-birth-gray-3 hover:text-birth-black">
            <span className="text-lg leading-none">×</span>
          </button>
        </div>
        {ok ? (
          <div className="p-6 text-center">
            <p className="text-green-600 font-dm font-medium">Clave actualizada correctamente</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div>
              <label className="block text-xs text-birth-gray-4 mb-1 font-dm uppercase tracking-wider">Clave actual</label>
              <input type="password" value={actual} onChange={e => setActual(e.target.value)} required autoFocus
                className="w-full border border-birth-gray-2 rounded px-3 py-2 text-sm font-dm focus:outline-none focus:border-birth-black tracking-widest" />
            </div>
            <div>
              <label className="block text-xs text-birth-gray-4 mb-1 font-dm uppercase tracking-wider">Nueva clave</label>
              <input type="password" value={nueva} onChange={e => setNueva(e.target.value)} required
                className="w-full border border-birth-gray-2 rounded px-3 py-2 text-sm font-dm focus:outline-none focus:border-birth-black tracking-widest" />
            </div>
            <div>
              <label className="block text-xs text-birth-gray-4 mb-1 font-dm uppercase tracking-wider">Confirmar nueva clave</label>
              <input type="password" value={confirmar} onChange={e => setConfirmar(e.target.value)} required
                className="w-full border border-birth-gray-2 rounded px-3 py-2 text-sm font-dm focus:outline-none focus:border-birth-black tracking-widest" />
            </div>
            {error && <p className="text-birth-red text-xs font-dm">{error}</p>}
            <div className="flex gap-3 pt-1">
              <button type="submit"
                className="flex-1 bg-birth-black text-white py-2.5 rounded text-sm font-dm font-medium hover:bg-birth-red transition-colors">
                Actualizar clave
              </button>
              <button type="button" onClick={onClose}
                className="px-4 border border-birth-gray-2 rounded text-sm font-dm text-birth-gray-4 hover:border-birth-black">
                Cancelar
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

// Pantalla de login principal
export default function Login({ onLogin }) {
  const [pin, setPin] = useState('')
  const [mostrar, setMostrar] = useState(false)
  const [error, setError] = useState(false)

  const handleSubmit = (e) => {
    e.preventDefault()
    if (pin === getPin()) {
      doLogin()
      onLogin()
    } else {
      setError(true)
      setPin('')
      setTimeout(() => setError(false), 2000)
    }
  }

  return (
    <div className="min-h-screen bg-birth-black flex items-center justify-center p-4">
      <div className="w-full max-w-xs">
        {/* Logo */}
        <div className="flex flex-col items-center mb-12">
          <img
            src="/cotizador/logo-birth.png"
            alt="Birth Studio"
            className="h-16 w-auto object-contain mb-3"
          />
          <div className="font-dm text-white/25 text-[10px] tracking-[0.4em] uppercase">
            Sistema Interno
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20">
              <Lock size={15} />
            </div>
            <input
              type={mostrar ? 'text' : 'password'}
              value={pin}
              onChange={e => setPin(e.target.value)}
              placeholder="Clave de acceso"
              autoFocus
              autoComplete="current-password"
              className={`w-full bg-white/5 border rounded-sm px-4 pl-10 py-3.5 text-white text-center tracking-[0.3em] font-dm text-base focus:outline-none transition-all duration-200 ${
                error
                  ? 'border-birth-red bg-birth-red/10 placeholder-birth-red/40'
                  : 'border-white/10 placeholder-white/20 focus:border-white/30 focus:bg-white/8'
              }`}
            />
            <button
              type="button"
              onClick={() => setMostrar(s => !s)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-white/25 hover:text-white/50 transition-colors"
            >
              {mostrar ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>

          {error && (
            <p className="text-birth-red text-xs text-center font-dm animate-pulse">
              Clave incorrecta
            </p>
          )}

          <button
            type="submit"
            className="w-full bg-birth-red text-white py-3 rounded-sm font-dm font-medium text-sm tracking-wide hover:bg-red-700 transition-colors"
          >
            Ingresar
          </button>
        </form>

        <p className="text-center text-white/15 text-xs font-dm mt-10 tracking-wider">
          Birth Studio SpA · Talca, Chile
        </p>
      </div>
    </div>
  )
}
