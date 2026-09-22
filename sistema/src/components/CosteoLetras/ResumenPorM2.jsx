import { Plus } from 'lucide-react'
import { clp } from '../../utils/formatters'

const MATERIALES = [
  { id: 'acrilico', label: 'Acrílico' },
  { id: 'trovicel', label: 'Trovicel' },
]
const ILUMINACION = [
  { id: 'con', label: 'Con iluminación' },
  { id: 'sin', label: 'Sin iluminación' },
]

function Toggle({ opciones, valor, onChange }) {
  return (
    <div className="flex gap-1.5">
      {opciones.map(o => (
        <button key={o.id} type="button" onClick={() => onChange(o.id)}
          className={`flex-1 py-1.5 rounded text-xs font-dm border transition-colors ${valor === o.id ? 'bg-birth-black text-white border-birth-black' : 'bg-white text-birth-gray-4 border-birth-gray-2 hover:border-birth-black'}`}>
          {o.label}
        </button>
      ))}
    </div>
  )
}

export default function ResumenPorM2({
  m2Proyecto, setM2Proyecto,
  material, setMaterial,
  iluminacion, setIluminacion,
  precioM2, setPrecioM2, onPrecioM2Blur,
  multActivo, setMultActivo, mult, setMult,
  instalacion, setInstalacion,
  subtotalLetrero, subtotalFinal, totalNeto,
  onAgregar,
}) {
  const m2 = parseFloat(m2Proyecto) || 0
  const ivaTotal = Math.round(totalNeto * 1.19)
  const anticipo = Math.round(ivaTotal * 0.5)
  const multNum = Number(mult) || 1.5

  return (
    <div className="bg-white border border-birth-gray-2 rounded divide-y divide-birth-gray-2">
      {/* Precio del letrero */}
      <div className="p-4 space-y-3">
        <p className="text-[11px] font-dm text-birth-gray-4 uppercase tracking-wider">Precio del letrero</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] font-dm text-birth-gray-4 uppercase block mb-1">m² de letras</label>
            <input type="number" min="0" step="0.01" value={m2Proyecto} onChange={e => setM2Proyecto(e.target.value)}
              className="w-full border border-birth-gray-2 rounded px-3 py-2 text-sm font-dm focus:outline-none focus:border-birth-black" />
          </div>
          <div>
            <label className="text-[10px] font-dm text-birth-gray-4 uppercase block mb-1">Precio por m² (editable)</label>
            <input type="number" min="0" value={precioM2} onChange={e => setPrecioM2(e.target.value)} onBlur={onPrecioM2Blur}
              className="w-full border-2 border-birth-black rounded px-3 py-2 text-sm font-barlow font-bold focus:outline-none focus:border-birth-red" />
          </div>
          <div>
            <label className="text-[10px] font-dm text-birth-gray-4 uppercase block mb-1">Material</label>
            <Toggle opciones={MATERIALES} valor={material} onChange={setMaterial} />
          </div>
          <div>
            <label className="text-[10px] font-dm text-birth-gray-4 uppercase block mb-1">Iluminación</label>
            <Toggle opciones={ILUMINACION} valor={iluminacion} onChange={setIluminacion} />
          </div>
        </div>
      </div>

      {/* Cálculo */}
      <div className="p-4 space-y-3">
        <div className="flex justify-between text-sm font-dm text-birth-gray-4">
          <span>Letrero{m2 > 0 ? ` · ${m2.toFixed(2)} m²` : ''}</span>
          <span className="font-medium text-birth-black">{clp(subtotalLetrero)}</span>
        </div>

        {/* Multiplicador opcional (apagado por defecto) */}
        <div className="rounded border border-birth-gray-2 p-2.5 space-y-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={multActivo} onChange={e => setMultActivo(e.target.checked)} className="accent-birth-black" />
            <span className="text-xs font-dm text-birth-gray-4">Aplicar multiplicador ×{multActivo ? ` (${multNum.toFixed(1)})` : ''}</span>
          </label>
          {multActivo && (
            <>
              <div className="flex items-center gap-2">
                <input type="range" min="1.5" max="4" step="0.1" value={multNum}
                  onChange={e => setMult(parseFloat(e.target.value))} className="flex-1 accent-birth-red cursor-pointer" />
                <span className="font-barlow text-sm font-bold text-birth-black w-12 text-right">×{multNum.toFixed(1)}</span>
              </div>
              <div className="flex justify-between text-sm font-dm">
                <span className="text-birth-gray-4">Con multiplicador</span>
                <span className="font-medium text-birth-black">{clp(subtotalFinal)}</span>
              </div>
            </>
          )}
        </div>

        <div>
          <label className="text-[10px] font-dm text-birth-gray-4 uppercase block mb-1">Instalación (aparte)</label>
          <input type="number" min="0" value={instalacion} onChange={e => setInstalacion(e.target.value)} placeholder="0"
            className="w-full border border-birth-gray-2 rounded px-3 py-1.5 text-sm font-dm focus:outline-none focus:border-birth-black" />
        </div>

        <div className="bg-birth-black rounded px-4 py-3 space-y-1.5">
          <div className="flex justify-between items-center">
            <span className="text-xs font-dm text-white/60">Total (neto)</span>
            <span className="font-barlow font-bold text-xl text-white">{clp(totalNeto)}</span>
          </div>
          <div className="flex justify-between text-xs font-dm text-white/60"><span>+ IVA 19%</span><span className="text-white/80">{clp(ivaTotal)}</span></div>
          <div className="flex justify-between text-xs font-dm text-white/60"><span>Anticipo 50%</span><span className="text-white/80">{clp(anticipo)}</span></div>
        </div>

        <button onClick={onAgregar} disabled={!totalNeto}
          className="w-full flex items-center justify-center gap-2 bg-birth-red text-white py-3 rounded text-sm font-dm font-medium hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
          <Plus size={15} /> Agregar a cotización
        </button>
      </div>
    </div>
  )
}
