import { useState, useRef, useEffect } from 'react'
import { Ruler, FileCode2, Image as ImageIcon, Sparkles, AlertTriangle } from 'lucide-react'
import SvgAnalisisSection from './SvgAnalisisSection'
import { estimarAreaPng, proporcionImagen } from '../../utils/pngArea'

// Paso 1 del costeo: define el M² de las letras por tres vías (pestañas):
//  · Medidas  → ancho × alto que da el cliente (lo más rápido)
//  · SVG      → exacto + calcula planchas y cantos (lo de siempre)
//  · PNG      → estimación del área por imagen (fondo transparente)
const TABS = [
  { id: 'medidas', label: 'Medidas', icon: Ruler, hint: 'Ancho × alto del cliente (lo más rápido)' },
  { id: 'svg', label: 'SVG', icon: FileCode2, hint: 'Exacto: además calcula planchas y cantos' },
  { id: 'png', label: 'PNG', icon: ImageIcon, hint: 'Estimado por imagen (fondo transparente)' },
]

function ResultadoM2({ m2, nota, onUsar }) {
  return (
    <>
      <div className="flex items-center justify-between bg-birth-gray rounded px-3 py-2.5">
        <span className="text-xs font-dm text-birth-gray-4">M² de letras{nota ? ` · ${nota}` : ''}</span>
        <span className="font-barlow text-xl font-bold text-birth-black">{m2 > 0 ? `${m2.toFixed(3)} m²` : '—'}</span>
      </div>
      <button onClick={onUsar} disabled={!m2}
        className="w-full flex items-center justify-center gap-2 bg-birth-black text-white py-2.5 rounded text-sm font-dm font-medium hover:bg-birth-red transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
        <Sparkles size={14} /> Usar este M² en el costeo
      </button>
    </>
  )
}

function TabMedidas({ setM2Proyecto }) {
  const inputRef = useRef(null)
  const [aspecto, setAspecto] = useState(null) // alto/ancho del logo
  const [logoNombre, setLogoNombre] = useState('')
  const [previewUrl, setPreviewUrl] = useState('')
  const [error, setError] = useState('')
  const [alto, setAlto] = useState('')
  const [ancho, setAncho] = useState('')

  // Libera el object URL del preview al desmontar.
  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl) }, [previewUrl])

  const subirLogo = async (file) => {
    setError('')
    if (!file) return
    try {
      const r = await proporcionImagen(file)
      setAspecto(r.aspecto)
      setLogoNombre(file.name)
      setPreviewUrl(prev => { if (prev) URL.revokeObjectURL(prev); return URL.createObjectURL(file) })
    } catch (e) {
      setError(e.message || 'No se pudo leer el logo.')
      setAspecto(null)
    }
  }

  const altoNum = parseFloat(alto) || 0
  const anchoAuto = aspecto && altoNum > 0 ? altoNum / aspecto : 0
  const anchoNum = aspecto ? anchoAuto : (parseFloat(ancho) || 0)
  const m2 = anchoNum > 0 && altoNum > 0 ? (anchoNum * altoNum) / 10000 : 0

  return (
    <div className="p-4 space-y-3">
      <p className="text-xs font-dm text-birth-gray-4">Escribe el alto que te da el cliente. Si subes el logo, calculo el ancho solo con su proporción.</p>

      <div
        onClick={() => inputRef.current?.click()}
        onDrop={e => { e.preventDefault(); subirLogo(e.dataTransfer.files?.[0]) }}
        onDragOver={e => e.preventDefault()}
        className="border-2 border-dashed border-birth-gray-3 rounded p-3 text-center cursor-pointer hover:border-birth-black transition-colors"
      >
        <p className="text-xs font-dm text-birth-gray-4">{logoNombre || 'Logo (opcional) para calcular el ancho — SVG o PNG'}</p>
        <input ref={inputRef} type="file" accept=".svg,image/*" className="hidden" onChange={e => subirLogo(e.target.files?.[0])} />
      </div>
      {error && <p className="text-xs font-dm text-birth-red">{error}</p>}

      {previewUrl && (
        <div className="rounded border border-birth-gray-2 bg-birth-gray p-2 flex items-center justify-center">
          <img src={previewUrl} alt="Vista del logo" className="max-h-40 w-auto object-contain" />
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[10px] font-dm text-birth-gray-4 uppercase block mb-1">Alto (cm)</label>
          <input type="number" min="0" value={alto} onChange={e => setAlto(e.target.value)} placeholder="Ej: 120"
            className="w-full border-2 border-birth-black rounded px-3 py-2 text-lg font-barlow font-bold focus:outline-none focus:border-birth-red" />
        </div>
        <div>
          <label className="text-[10px] font-dm text-birth-gray-4 uppercase block mb-1">Ancho (cm){aspecto ? ' · auto' : ''}</label>
          {aspecto ? (
            <div className="w-full border-2 border-birth-gray-2 rounded px-3 py-2 text-lg font-barlow font-bold text-birth-gray-4">
              {anchoAuto > 0 ? anchoAuto.toFixed(1) : '—'}
            </div>
          ) : (
            <input type="number" min="0" value={ancho} onChange={e => setAncho(e.target.value)} placeholder="Ej: 300"
              className="w-full border-2 border-birth-black rounded px-3 py-2 text-lg font-barlow font-bold focus:outline-none focus:border-birth-red" />
          )}
        </div>
      </div>

      <ResultadoM2 m2={m2} onUsar={() => m2 > 0 && setM2Proyecto(String(Math.round(m2 * 1000) / 1000))} />
    </div>
  )
}

function TabPng({ setM2Proyecto }) {
  const inputRef = useRef(null)
  const [nombre, setNombre] = useState('')
  const [frac, setFrac] = useState(null) // { fraccion, aspecto }
  const [anchoReal, setAnchoReal] = useState('')
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(false)

  const procesar = async (file) => {
    setError('')
    if (!file) return
    setCargando(true)
    try {
      const r = await estimarAreaPng(file)
      setFrac(r)
      setNombre(file.name)
    } catch (e) {
      setError(e.message || 'No se pudo procesar la imagen.')
      setFrac(null)
    } finally {
      setCargando(false)
    }
  }

  const aReal = parseFloat(anchoReal) || 0
  const anchoM = aReal / 100
  const altoM = frac ? anchoM * frac.aspecto : 0
  const m2 = frac && aReal > 0 ? frac.fraccion * anchoM * altoM : 0

  return (
    <div className="p-4 space-y-3">
      <div
        onClick={() => inputRef.current?.click()}
        onDrop={e => { e.preventDefault(); procesar(e.dataTransfer.files?.[0]) }}
        onDragOver={e => e.preventDefault()}
        className="border-2 border-dashed border-birth-gray-3 rounded p-6 text-center cursor-pointer hover:border-birth-black transition-colors"
      >
        <ImageIcon size={20} className="mx-auto mb-2 text-birth-gray-3" />
        <p className="text-sm font-dm text-birth-gray-4">{nombre || 'Arrastra el PNG del logo aquí o haz clic'}</p>
        <p className="text-[11px] font-dm text-birth-gray-3 mt-1">Fondo transparente. Estima el área; las planchas van a mano.</p>
        <input ref={inputRef} type="file" accept="image/png,image/webp" className="hidden" onChange={e => procesar(e.target.files?.[0])} />
      </div>

      {error && (
        <p className="flex items-start gap-1.5 text-xs font-dm text-birth-red bg-red-50 border border-red-200 rounded px-3 py-2">
          <AlertTriangle size={14} className="shrink-0 mt-0.5" /> {error}
        </p>
      )}

      <div>
        <label className="text-[11px] font-dm text-birth-gray-4 uppercase tracking-wider block mb-1">Ancho real del diseño (cm)</label>
        <input type="number" min="0" value={anchoReal} onChange={e => setAnchoReal(e.target.value)} placeholder="Ej: 300"
          className="w-full border-2 border-birth-black rounded px-3 py-2 text-lg font-barlow font-bold focus:outline-none focus:border-birth-red" />
      </div>

      <ResultadoM2
        m2={m2}
        nota={cargando ? 'calculando…' : 'estimado'}
        onUsar={() => m2 > 0 && setM2Proyecto(String(Math.round(m2 * 1000) / 1000))}
      />
    </div>
  )
}

export default function TamanoLetrasSection({ mesa, setMesa, separacion, setSeparacion, onAplicarSugerencias, setM2Proyecto }) {
  const [tab, setTab] = useState('medidas')
  const hint = TABS.find(t => t.id === tab)?.hint

  return (
    <div>
      <div className="p-4 pb-0">
        <p className="text-[11px] font-dm text-birth-gray-4 uppercase tracking-wider">1. Tamaño de las letras</p>
        <p className="text-[11px] font-dm text-birth-gray-3 mt-0.5">Define el M² de las letras. Elige cómo:</p>
      </div>

      <div className="px-4 pt-3">
        <div className="flex gap-1 rounded-lg bg-birth-gray p-1">
          {TABS.map(t => (
            <button key={t.id} type="button" onClick={() => setTab(t.id)}
              className={`flex-1 flex flex-col items-center gap-0.5 py-2 rounded-md text-xs font-dm transition-colors ${tab === t.id ? 'bg-white text-birth-black shadow-sm font-semibold' : 'text-birth-gray-4 hover:text-birth-black'}`}>
              <t.icon size={15} />
              <span>{t.label}</span>
            </button>
          ))}
        </div>
        <p className="text-[10px] font-dm text-birth-gray-3 text-center mt-1">{hint}</p>
      </div>

      {tab === 'medidas' && <TabMedidas setM2Proyecto={setM2Proyecto} />}
      {tab === 'png' && <TabPng setM2Proyecto={setM2Proyecto} />}
      {tab === 'svg' && (
        <SvgAnalisisSection
          mesa={mesa} setMesa={setMesa}
          separacion={separacion} setSeparacion={setSeparacion}
          onAplicarSugerencias={onAplicarSugerencias}
          sinTitulo
        />
      )}
    </div>
  )
}
