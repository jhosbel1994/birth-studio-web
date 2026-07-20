import { GRUPO_LOGISTICA_FIJA, LOGISTICA_POR_DIA_DEFAULT } from '../../data/costeoLetras'
import GrupoCostosSection from './GrupoCostosItems'

// Producción (horas CNC + tarifa luz + desgaste de herramientas, siempre
// activo) y Logística (ítems fijos vía GrupoCostosSection + traslado libre +
// arriendo de andamios / día de empleado, ambos por cantidad de días).
export default function ProduccionLogisticaSection({
  horasCnc, setHorasCnc, desgastePct, setDesgastePct,
  precios, onPrecioChange, onPrecioBlur,
  itemsState, onToggle, onCantidad,
  logisticaLibre, setLogisticaLibre,
}) {
  const precioCnc = precios.prod_cnc_hora ?? 20000
  const precioLuz = precios.prod_luz_hora ?? 2000
  const precioAndamioDia = precios.log_andamio_dia ?? LOGISTICA_POR_DIA_DEFAULT.precioAndamioDia
  const precioEmpleadoDia = precios.log_empleado_dia ?? LOGISTICA_POR_DIA_DEFAULT.precioEmpleadoDia

  const set = (patch) => setLogisticaLibre(l => ({ ...l, ...patch }))

  return (
    <div>
      {/* ── PRODUCCIÓN ── */}
      <div className="px-4 py-2 bg-birth-gray border-y border-birth-gray-2">
        <p className="text-[10px] font-dm font-bold uppercase tracking-wider text-birth-gray-4">Producción — Router CNC</p>
      </div>
      <div className="p-4 space-y-3">
        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="text-[10px] font-dm text-birth-gray-4 uppercase block mb-1">Horas CNC</label>
            <input type="number" min="0" step="0.5" value={horasCnc} onChange={e => setHorasCnc(e.target.value)}
              className="w-full text-center border border-birth-gray-2 rounded px-2 py-1.5 text-sm font-dm focus:outline-none focus:border-birth-black" />
          </div>
          <div>
            <label className="text-[10px] font-dm text-birth-gray-4 uppercase block mb-1">$/hora CNC</label>
            <input type="number" min="0" value={precioCnc}
              onChange={e => onPrecioChange('prod_cnc_hora', e.target.value)} onBlur={onPrecioBlur}
              className="w-full text-center border border-birth-gray-2 rounded px-2 py-1.5 text-sm font-dm focus:outline-none focus:border-birth-black" />
          </div>
          <div>
            <label className="text-[10px] font-dm text-birth-gray-4 uppercase block mb-1">$/hora luz</label>
            <input type="number" min="0" value={precioLuz}
              onChange={e => onPrecioChange('prod_luz_hora', e.target.value)} onBlur={onPrecioBlur}
              className="w-full text-center border border-birth-gray-2 rounded px-2 py-1.5 text-sm font-dm focus:outline-none focus:border-birth-black" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs font-dm text-birth-gray-4 flex-1">Desgaste de herramientas (siempre activo, % sobre materiales)</label>
          <div className="flex items-center border-2 border-birth-black rounded overflow-hidden shrink-0">
            <input type="number" min="0" step="0.5" value={desgastePct} onChange={e => setDesgastePct(e.target.value)}
              className="w-14 text-center py-1.5 text-sm font-dm font-bold focus:outline-none" />
            <span className="px-2 py-1.5 bg-birth-gray text-xs font-dm text-birth-gray-4">%</span>
          </div>
        </div>
      </div>

      {/* ── LOGÍSTICA FIJA ── */}
      <GrupoCostosSection
        titulo="Logística e instalación"
        items={GRUPO_LOGISTICA_FIJA}
        itemsState={itemsState} precios={precios}
        onToggle={onToggle} onCantidad={onCantidad}
        onPrecioChange={onPrecioChange} onPrecioBlur={onPrecioBlur}
      />

      {/* ── LOGÍSTICA VARIABLE ── */}
      <div className="p-4 space-y-3">
        <div>
          <label className="text-[10px] font-dm text-birth-gray-4 uppercase block mb-1">Traslado fuera de Talca — monto manual ($)</label>
          <input type="number" min="0" value={logisticaLibre.trasladoFueraTalca} onChange={e => set({ trasladoFueraTalca: e.target.value })}
            placeholder="0" className="w-full border border-birth-gray-2 rounded px-3 py-1.5 text-sm font-dm focus:outline-none focus:border-birth-black" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] font-dm text-birth-gray-4 uppercase block mb-1">Días de andamio</label>
            <input type="number" min="0" value={logisticaLibre.diasAndamio} onChange={e => set({ diasAndamio: e.target.value })}
              className="w-full text-center border border-birth-gray-2 rounded px-2 py-1.5 text-sm font-dm focus:outline-none focus:border-birth-black" />
          </div>
          <div>
            <label className="text-[10px] font-dm text-birth-gray-4 uppercase block mb-1">$/día andamio</label>
            <input type="number" min="0" value={precioAndamioDia}
              onChange={e => onPrecioChange('log_andamio_dia', e.target.value)} onBlur={onPrecioBlur}
              className="w-full text-center border border-birth-gray-2 rounded px-2 py-1.5 text-sm font-dm focus:outline-none focus:border-birth-black" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] font-dm text-birth-gray-4 uppercase block mb-1">Días de empleado</label>
            <input type="number" min="0" value={logisticaLibre.diasEmpleado} onChange={e => set({ diasEmpleado: e.target.value })}
              className="w-full text-center border border-birth-gray-2 rounded px-2 py-1.5 text-sm font-dm focus:outline-none focus:border-birth-black" />
          </div>
          <div>
            <label className="text-[10px] font-dm text-birth-gray-4 uppercase block mb-1">$/día empleado</label>
            <input type="number" min="0" value={precioEmpleadoDia}
              onChange={e => onPrecioChange('log_empleado_dia', e.target.value)} onBlur={onPrecioBlur}
              className="w-full text-center border border-birth-gray-2 rounded px-2 py-1.5 text-sm font-dm focus:outline-none focus:border-birth-black" />
          </div>
        </div>
      </div>
    </div>
  )
}
