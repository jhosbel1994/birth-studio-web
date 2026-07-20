import { useState, useEffect, useCallback, useRef } from 'react'
import { Upload, AlertTriangle, Sparkles } from 'lucide-react'
import {
  parseSvgPiezas, calcularEscala, escalarPiezas,
  calcularAreaRellena, nestearPiezas, calcularCantos,
} from '../../utils/nestingLetras'
import { GRUPO_ACRILICO, GRUPO_TROVICEL, ALTURAS_CANTO_CM, ALTO_CANTO_DEFAULT_CM } from '../../data/costeoLetras'
import MesaCanvas from './MesaCanvas'

const MATERIALES_PLANCHA = [...GRUPO_ACRILICO, ...GRUPO_TROVICEL]

export default function SvgAnalisisSection({ mesa, setMesa, separacion, setSeparacion, onAplicarSugerencias }) {
  const [svgInfo, setSvgInfo] = useState(null) // { piezas, bboxUnion, svgTextNormalizado, nombreArchivo }
  const [error, setError] = useState('')
  const [anchoRealCm, setAnchoRealCm] = useState('')
  const [altoCantoSel, setAltoCantoSel] = useState(String(ALTO_CANTO_DEFAULT_CM))
  const [altoCantoManual, setAltoCantoManual] = useState('')
  const [materialId, setMaterialId] = useState(MATERIALES_PLANCHA[0].id)
  const [areaM2, setAreaM2] = useState(0)
  const [calculandoArea, setCalculandoArea] = useState(false)
  const inputRef = useRef(null)

  const altoCantoCm = altoCantoSel === 'otro' ? (parseFloat(altoCantoManual) || 0) : parseFloat(altoCantoSel)

  const procesarArchivo = async (file) => {
    setError('')
    if (!file) return
    const ext = file.name.split('.').pop().toLowerCase()
    if (ext === 'cdr' || ext === 'ai') {
      setError(`Los archivos .${ext} no se pueden leer en el navegador. Exporta a SVG desde ${ext === 'cdr' ? 'CorelDRAW (Archivo → Exportar → SVG)' : 'Illustrator (Exportar como → SVG)'} y sube ese archivo.`)
      return
    }
    if (ext !== 'svg') {
      setError('Formato no soportado. Sube un archivo .svg.')
      return
    }
    try {
      const texto = await file.text()
      const resultado = parseSvgPiezas(texto)
      setSvgInfo({ ...resultado, nombreArchivo: file.name })
    } catch (err) {
      setError(err.message || 'No se pudo procesar el SVG.')
      setSvgInfo(null)
    }
  }

  const onDrop = useCallback((e) => {
    e.preventDefault()
    procesarArchivo(e.dataTransfer.files?.[0])
  }, [])

  // ── Escala + nesting + cantos: síncrono y barato, se recalcula en cada render ──
  const anchoNum = parseFloat(anchoRealCm) || 0
  let nesting = null
  let cantos = null
  let perimetroTotalM = 0
  if (svgInfo && anchoNum > 0) {
    const mmPorUnidad = calcularEscala(svgInfo.bboxUnion, anchoNum)
    const piezasMm = escalarPiezas(svgInfo.piezas, mmPorUnidad)
    nesting = nestearPiezas(piezasMm, mesa.ancho, mesa.alto, separacion)
    const perimetroTotalMm = piezasMm.reduce((s, p) => s + p.perimetroMm, 0)
    perimetroTotalM = perimetroTotalMm / 1000
    if (altoCantoCm > 0) {
      cantos = calcularCantos(perimetroTotalMm, mesa.ancho, mesa.alto, altoCantoCm * 10, separacion)
    }
  }

  // ── Área rellena: rasterizado async, solo cuando cambia el archivo o el ancho real ──
  useEffect(() => {
    if (!svgInfo || anchoNum <= 0) { setAreaM2(0); return }
    let cancelado = false
    setCalculandoArea(true)
    const anchoRealM = anchoNum / 100
    const altoRealM = anchoRealM * (svgInfo.bboxUnion.height / svgInfo.bboxUnion.width)
    calcularAreaRellena(svgInfo.svgTextNormalizado)
      .then(fraccion => { if (!cancelado) setAreaM2(fraccion * anchoRealM * altoRealM) })
      .catch(() => { if (!cancelado) setAreaM2(0) })
      .finally(() => { if (!cancelado) setCalculandoArea(false) })
    return () => { cancelado = true }
  }, [svgInfo, anchoNum])

  const totalPlanchasCaras = nesting ? nesting.mesas.length : 0
  const totalPlanchas = totalPlanchasCaras + (cantos?.planchasCantos || 0)

  const handleAplicar = () => {
    if (!totalPlanchas || !areaM2) return
    onAplicarSugerencias({ materialId, totalPlanchas, areaM2 })
  }

  return (
    <div className="divide-y divide-birth-gray-2">
      <div className="p-4 space-y-3">
        <p className="text-[11px] font-dm text-birth-gray-4 uppercase tracking-wider">1. Diseño (SVG)</p>

        <div
          onDrop={onDrop}
          onDragOver={e => e.preventDefault()}
          onClick={() => inputRef.current?.click()}
          className="border-2 border-dashed border-birth-gray-3 rounded p-6 text-center cursor-pointer hover:border-birth-black transition-colors"
        >
          <Upload size={20} className="mx-auto mb-2 text-birth-gray-3" />
          <p className="text-sm font-dm text-birth-gray-4">
            {svgInfo ? svgInfo.nombreArchivo : 'Arrastra el .svg del logo aquí o haz clic para elegir'}
          </p>
          <p className="text-[11px] font-dm text-birth-gray-3 mt-1">Exportado desde CorelDRAW o Illustrator como SVG</p>
          <input ref={inputRef} type="file" accept=".svg" className="hidden" onChange={e => procesarArchivo(e.target.files?.[0])} />
        </div>

        {error && (
          <p className="flex items-start gap-1.5 text-xs font-dm text-birth-red bg-red-50 border border-red-200 rounded px-3 py-2">
            <AlertTriangle size={14} className="shrink-0 mt-0.5" /> {error}
          </p>
        )}

        <div>
          <label className="text-[11px] font-dm text-birth-gray-4 uppercase tracking-wider block mb-1">Ancho real del diseño (cm)</label>
          <input
            type="number" min="0" value={anchoRealCm} onChange={e => setAnchoRealCm(e.target.value)}
            placeholder="Ej: 300"
            className="w-full border-2 border-birth-black rounded px-3 py-2 text-lg font-barlow font-bold focus:outline-none focus:border-birth-red"
          />
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="text-[10px] font-dm text-birth-gray-4 uppercase block mb-1">Mesa ancho (mm)</label>
            <input type="number" min="1" value={mesa.ancho}
              onChange={e => setMesa(m => ({ ...m, ancho: parseFloat(e.target.value) || m.ancho }))}
              className="w-full border border-birth-gray-2 rounded px-2 py-1.5 text-sm font-dm focus:outline-none focus:border-birth-black" />
          </div>
          <div>
            <label className="text-[10px] font-dm text-birth-gray-4 uppercase block mb-1">Mesa alto (mm)</label>
            <input type="number" min="1" value={mesa.alto}
              onChange={e => setMesa(m => ({ ...m, alto: parseFloat(e.target.value) || m.alto }))}
              className="w-full border border-birth-gray-2 rounded px-2 py-1.5 text-sm font-dm focus:outline-none focus:border-birth-black" />
          </div>
          <div>
            <label className="text-[10px] font-dm text-birth-gray-4 uppercase block mb-1">Separación (mm)</label>
            <input type="number" min="0" value={separacion}
              onChange={e => setSeparacion(parseFloat(e.target.value) || 0)}
              className="w-full border border-birth-gray-2 rounded px-2 py-1.5 text-sm font-dm focus:outline-none focus:border-birth-black" />
          </div>
        </div>

        <div>
          <label className="text-[11px] font-dm text-birth-gray-4 uppercase tracking-wider block mb-1.5">Alto del canto</label>
          <div className="flex flex-wrap gap-1.5">
            {ALTURAS_CANTO_CM.map(h => (
              <button key={h} onClick={() => setAltoCantoSel(String(h))}
                className={`px-3 py-1.5 rounded text-xs font-dm border transition-colors ${altoCantoSel === String(h) ? 'bg-birth-black text-white border-birth-black' : 'bg-white text-birth-gray-4 border-birth-gray-2 hover:border-birth-black'}`}>
                {h}cm
              </button>
            ))}
            <button onClick={() => setAltoCantoSel('otro')}
              className={`px-3 py-1.5 rounded text-xs font-dm border transition-colors ${altoCantoSel === 'otro' ? 'bg-birth-black text-white border-birth-black' : 'bg-white text-birth-gray-4 border-birth-gray-2 hover:border-birth-black'}`}>
              Otro
            </button>
          </div>
          {altoCantoSel === 'otro' && (
            <input type="number" min="0" step="0.1" value={altoCantoManual} onChange={e => setAltoCantoManual(e.target.value)}
              placeholder="cm" className="mt-1.5 w-24 border border-birth-gray-2 rounded px-2 py-1.5 text-sm font-dm focus:outline-none focus:border-birth-black" />
          )}
        </div>
      </div>

      {nesting && (
        <div className="p-4 space-y-3">
          <p className="text-[11px] font-dm text-birth-gray-4 uppercase tracking-wider">2. Distribución en mesa</p>

          {nesting.piezasGigantes.length > 0 && (
            <p className="flex items-start gap-1.5 text-xs font-dm text-birth-red bg-red-50 border border-red-200 rounded px-3 py-2">
              <AlertTriangle size={14} className="shrink-0 mt-0.5" />
              {nesting.piezasGigantes.length} pieza{nesting.piezasGigantes.length !== 1 ? 's' : ''} más grande{nesting.piezasGigantes.length !== 1 ? 's' : ''} que la mesa — revisa el diseño manualmente.
            </p>
          )}

          <div className="grid sm:grid-cols-2 gap-3">
            {nesting.mesas.map((m, i) => (
              <MesaCanvas key={i} mesa={m} mesaAncho={mesa.ancho} mesaAlto={mesa.alto} indice={i} />
            ))}
          </div>

          <div className="bg-birth-gray rounded p-3 grid grid-cols-2 gap-y-1.5 text-xs font-dm text-birth-gray-4">
            <span>Piezas detectadas</span><span className="text-right font-medium text-birth-black">{svgInfo.piezas.length}</span>
            <span>Área (rellena)</span><span className="text-right font-medium text-birth-black">{calculandoArea ? 'calculando…' : `${areaM2.toFixed(3)} m²`}</span>
            <span>Perímetro total</span><span className="text-right font-medium text-birth-black">{perimetroTotalM.toFixed(2)} m</span>
            <span>Planchas de caras</span><span className="text-right font-medium text-birth-black">{totalPlanchasCaras}</span>
            {cantos && (
              <>
                <span>Tiras de canto ({cantos.tirasPorPlancha}/plancha)</span><span className="text-right font-medium text-birth-black">{cantos.tiras}</span>
                <span>Planchas de cantos</span><span className="text-right font-medium text-birth-black">{cantos.planchasCantos}</span>
              </>
            )}
            <span className="font-bold text-birth-black border-t border-birth-gray-2 pt-1.5 mt-1">Total planchas</span>
            <span className="text-right font-bold text-birth-black border-t border-birth-gray-2 pt-1.5 mt-1">{totalPlanchas}</span>
          </div>

          <div>
            <label className="text-[11px] font-dm text-birth-gray-4 uppercase tracking-wider block mb-1">Material para estas planchas</label>
            <select value={materialId} onChange={e => setMaterialId(e.target.value)}
              className="w-full border border-birth-gray-2 rounded px-3 py-2 text-sm font-dm focus:outline-none bg-white">
              {MATERIALES_PLANCHA.map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}
            </select>
          </div>

          <button onClick={handleAplicar} disabled={!totalPlanchas || !areaM2}
            className="w-full flex items-center justify-center gap-2 bg-birth-black text-white py-2.5 rounded text-sm font-dm font-medium hover:bg-birth-red transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
            <Sparkles size={14} /> Aplicar sugerencias al costeo
          </button>
        </div>
      )}
    </div>
  )
}
