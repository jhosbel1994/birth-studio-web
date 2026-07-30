import { useState } from 'react'
import { Eye, EyeOff, Lock } from 'lucide-react'
import { GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth'
import { auth } from '../firebase'
import { getPin, setPin as setPinDB, migrarDesdeLocalStorage } from '../utils/storage'

const SESSION_KEY = 'BIRTH_LOGGED_IN'

export function isLoggedIn() {
  return sessionStorage.getItem(SESSION_KEY) === '1'
}

export function doLogin() {
  sessionStorage.setItem(SESSION_KEY, '1')
}

export function doLogout() {
  sessionStorage.removeItem(SESSION_KEY)
  signOut(auth).catch(() => {})
}

// Modal para cambiar PIN
export function ModalCambiarPin({ onClose }) {
  const [actual, setActual] = useState('')
  const [nueva, setNueva] = useState('')
  const [confirmar, setConfirmar] = useState('')
  const [error, setError] = useState('')
  const [ok, setOk] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    const pinActual = await getPin()
    if (actual !== pinActual) { setError('La clave actual es incorrecta'); return }
    if (nueva.length < 4) { setError('La nueva clave debe tener al menos 4 caracteres'); return }
    if (nueva !== confirmar) { setError('Las claves no coinciden'); return }
    await setPinDB(nueva)
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
// Dos pasos: 1) PIN de siempre (acceso rápido a la interfaz).
// 2) Solo si este navegador no tiene ya una sesión de Firebase guardada
//    (la primera vez, o tras cerrar sesión), pide iniciar sesión con
//    Google — esa es la identidad que protege la escritura en
//    Firestore/Storage (ej. Galería). Firebase recuerda la sesión sola
//    después, así que este segundo paso no se repite cada vez.
export default function Login({ onLogin }) {
  const [paso, setPaso] = useState('pin') // 'pin' | 'google'
  const [pin, setPin] = useState('')
  const [mostrar, setMostrar] = useState(false)
  const [error, setError] = useState(false)
  const [cargando, setCargando] = useState(false)
  const [errorGoogle, setErrorGoogle] = useState('')

  const handleSubmitPin = async (e) => {
    e.preventDefault()
    setCargando(true)
    try {
      // Migrar datos de localStorage a Firestore si es la primera vez
      await migrarDesdeLocalStorage()
      const pinGuardado = await getPin()
      if (pin === pinGuardado) {
        if (auth.currentUser) {
          doLogin()
          onLogin()
        } else {
          setPaso('google')
        }
      } else {
        setError(true)
        setPin('')
        setTimeout(() => setError(false), 2000)
      }
    } catch {
      setError(true)
      setPin('')
      setTimeout(() => setError(false), 2000)
    } finally {
      setCargando(false)
    }
  }

  const handleGoogle = async () => {
    setCargando(true)
    setErrorGoogle('')
    try {
      await signInWithPopup(auth, new GoogleAuthProvider())
      doLogin()
      onLogin()
    } catch {
      setErrorGoogle('No se pudo iniciar sesión con Google. Intenta de nuevo.')
    } finally {
      setCargando(false)
    }
  }

  return (
    <div className="min-h-screen bg-birth-black flex items-center justify-center p-4">
      <div className="w-full max-w-xs">
        <div className="flex flex-col items-center mb-12">
          <img src="/cotizador/logo-birth.png" alt="Birth Studio" className="h-16 w-auto object-contain mb-3" />
          <div className="font-dm text-white/25 text-[10px] tracking-[0.4em] uppercase">Sistema Interno</div>
        </div>

        {paso === 'pin' ? (
          <form onSubmit={handleSubmitPin} className="space-y-4">
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
                  error ? 'border-birth-red bg-birth-red/10 placeholder-birth-red/40' : 'border-white/10 placeholder-white/20 focus:border-white/30'
                }`}
              />
              <button type="button" onClick={() => setMostrar(s => !s)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-white/25 hover:text-white/50 transition-colors">
                {mostrar ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>

            {error && <p className="text-birth-red text-xs text-center font-dm animate-pulse">Clave incorrecta</p>}

            <button type="submit" disabled={cargando}
              className="w-full bg-birth-red text-white py-3 rounded-sm font-dm font-medium text-sm tracking-wide hover:bg-red-700 transition-colors disabled:opacity-60">
              {cargando ? 'Verificando...' : 'Ingresar'}
            </button>
          </form>
        ) : (
          <div className="space-y-4">
            <p className="text-center text-white/40 text-xs font-dm mb-2 leading-relaxed">
              Primera vez en este dispositivo — inicia sesión con Google para habilitar la Galería.
            </p>

            {errorGoogle && <p className="text-birth-red text-xs text-center font-dm animate-pulse">{errorGoogle}</p>}

            <button type="button" onClick={handleGoogle} disabled={cargando}
              className="w-full flex items-center justify-center gap-3 bg-white text-birth-black py-3 rounded-sm font-dm font-medium text-sm tracking-wide hover:bg-white/90 transition-colors disabled:opacity-60">
              <svg width="17" height="17" viewBox="0 0 48 48" aria-hidden="true">
                <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"/>
                <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"/>
                <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"/>
                <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 01-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"/>
              </svg>
              {cargando ? 'Verificando...' : 'Continuar con Google'}
            </button>
            <button type="button" onClick={() => setPaso('pin')}
              className="w-full text-white/25 hover:text-white/50 text-xs font-dm text-center transition-colors">
              ← Volver
            </button>
          </div>
        )}

        <p className="text-center text-white/15 text-xs font-dm mt-10 tracking-wider">Birth Studio SpA · Talca, Chile</p>
      </div>
    </div>
  )
}
