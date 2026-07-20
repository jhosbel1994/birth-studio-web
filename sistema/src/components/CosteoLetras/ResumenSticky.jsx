import { Plus } from 'lucide-react'
import { clp } from '../../utils/formatters'
import { MARGENES_LETRAS } from '../../data/costeoLetras'

function Fila({ label, value, bold }) {
  return (
    <div className={`flex justify-between text-sm font-dm ${bold ? 'font-bold text-birth-black' : 'text-birth-gray-4'}`}>
      <span>{label}</span><span>{clp(value)}</span>
    </div>
  )
}

export default function ResumenSticky({
  resultado, margen, setMargen,
  m2Proyecto, setM2Proyecto,
  precioCalleM2, setPrecioCalleM2, onPrecioCalleBlur,
  onAgregar,
}) {
  const {
    acrilico, trovicel, insumos, fachadaTotal, logistica,
    desgaste, produccionTotal,
    costoTotal, ventaNeta, ventaIva, anticipo, utilidad, precioM2,
    totalCalle, diferenciaCalle, utilidadAPrecioCalle,
  } = resultado

  return (
    <div className="lg:sticky lg:top-0 lg:self-start bg-white border border-birth-gray-2 rounded divide-y divide-birth-gray-2">
      <div className="p-4 space-y-3">
        <p className="text-[11px] font-dm text-birth-gray-4 uppercase tracking-wider">Datos del proyecto</p>
        <div>
          <label className="text-[10px] font-dm text-birth-gray-4 uppercase block mb-1">m² de letras</label>
          <input type="number" min="0" step="0.01" value={m2Proyecto} onChange={e => setM2Proyecto(e.target.value)}
            className="w-full border border-birth-gray-2 rounded px-3 py-1.5 text-sm font-dm focus:outline-none focus:border-birth-black" />
        </div>
        <div>
          <label className="text-[10px] font-dm text-birth-gray-4 uppercase block mb-1">Precio de calle por m² (referencia)</label>
          <input type="number" min="0" value={precioCalleM2} onChange={e => setPrecioCalleM2(e.target.value)} onBlur={onPrecioCalleBlur}
            className="w-full border border-birth-gray-2 rounded px-3 py-1.5 text-sm font-dm focus:outline-none focus:border-birth-black" />
        </div>
      </div>

      <div className="p-4 space-y-1.5">
        <p className="text-[11px] font-dm text-birth-gray-4 uppercase tracking-wider mb-1">Desglose de costo</p>
        <Fila label="Acrílico" value={acrilico} />
        <Fila label="Trovicel / PVC" value={trovicel} />
        <Fila label="Fachada" value={fachadaTotal} />
        <Fila label="Insumos" value={insumos} />
        <Fila label="Producción (CNC + luz)" value={produccionTotal} />
        <Fila label="Logística e instalación" value={logistica} />
        <Fila label="Desgaste de herramientas" value={desgaste} />
        <div className="border-t border-birth-gray-2 pt-1.5 mt-1.5">
          <Fila label="COSTO TOTAL" value={costoTotal} bold />
        </div>
      </div>

      <div className="p-4 space-y-3">
        <p className="text-[11px] font-dm text-birth-gray-4 uppercase tracking-wider">Margen</p>
        <div className="flex gap-1.5">
          {MARGENES_LETRAS.map(m => (
            <button key={m} onClick={() => setMargen(m)}
              className={`flex-1 py-1.5 rounded text-xs font-dm border transition-colors ${margen === m ? 'bg-birth-black text-white border-birth-black' : 'bg-white text-birth-gray-4 border-birth-gray-2 hover:border-birth-black'}`}>
              ×{m}
            </button>
          ))}
          <input type="number" min="0" step="0.1" value={margen} onChange={e => setMargen(parseFloat(e.target.value) || 0)}
            className="w-16 text-center border-2 border-birth-black rounded px-1 py-1.5 text-xs font-dm font-bold focus:outline-none focus:border-birth-red" />
        </div>

        <div className="bg-birth-black rounded px-4 py-3 space-y-1.5">
          <div className="flex justify-between items-center">
            <span className="text-xs font-dm text-white/60">Precio de venta (neto)</span>
            <span className="font-barlow font-bold text-xl text-white">{clp(ventaNeta)}</span>
          </div>
          <div className="flex justify-between text-xs font-dm text-white/60"><span>+ IVA 19%</span><span className="text-white/80">{clp(ventaIva)}</span></div>
          <div className="flex justify-between text-xs font-dm text-white/60"><span>Anticipo 50%</span><span className="text-white/80">{clp(anticipo)}</span></div>
          <div className="flex justify-between text-xs font-dm text-white/60"><span>Utilidad</span><span className="text-white/80">{clp(utilidad)}</span></div>
          {precioM2 > 0 && (
            <div className="flex justify-between text-xs font-dm text-white/60"><span>Precio por m²</span><span className="text-white/80">{clp(precioM2)}</span></div>
          )}
        </div>

        {totalCalle > 0 && (
          <div className="bg-birth-gray rounded px-4 py-3 space-y-1">
            <p className="text-[11px] font-dm text-birth-gray-4 uppercase tracking-wider mb-1">Comparación con precio de calle</p>
            <div className="flex justify-between text-sm font-dm">
              <span className="text-birth-gray-4">Total a precio de calle</span>
              <span className="font-medium text-birth-black">{clp(totalCalle)}</span>
            </div>
            <div className="flex justify-between text-sm font-dm">
              <span className="text-birth-gray-4">{diferenciaCalle >= 0 ? 'Sobre calle por' : 'Bajo calle por'}</span>
              <span className={`font-bold ${diferenciaCalle >= 0 ? 'text-green-600' : 'text-birth-red'}`}>{clp(Math.abs(diferenciaCalle))}</span>
            </div>
            <div className="flex justify-between text-sm font-dm">
              <span className="text-birth-gray-4">Utilidad si cobro precio calle</span>
              <span className="font-medium text-birth-black">{clp(utilidadAPrecioCalle)}</span>
            </div>
          </div>
        )}

        <button onClick={onAgregar} disabled={!ventaNeta}
          className="w-full flex items-center justify-center gap-2 bg-birth-red text-white py-3 rounded text-sm font-dm font-medium hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
          <Plus size={15} /> Agregar a cotización
        </button>
      </div>
    </div>
  )
}
