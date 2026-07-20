import { GRUPO_FACHADA } from '../../data/costeoLetras'
import { calcularFilaFachada } from '../../utils/costeoLetrasCalc'
import { clp } from '../../utils/formatters'

// Grupo Fachada: cantidad de planchas + precio editable + medida de plancha
// propia editable (mm) — a diferencia de Acrílico/Trovicel/Insumos, cada ítem
// puede tener un tamaño de plancha distinto (ACM 1220×2440, Metaldising 1000×3000...).
export default function FachadaCosteoSection({ rows, precios, onChangeRow, onPrecioChange, onPrecioBlur }) {
  return (
    <div>
      <div className="px-4 py-2 bg-birth-gray border-y border-birth-gray-2">
        <p className="text-[10px] font-dm font-bold uppercase tracking-wider text-birth-gray-4">Fachada</p>
      </div>
      {GRUPO_FACHADA.map(item => {
        const row = rows[item.id] || { activo: false, cantidad: '', anchoMm: item.medida.ancho, altoMm: item.medida.alto }
        const precio = precios[item.id] ?? item.precio
        const { m2Cubiertos, subtotal } = calcularFilaFachada(item, row, precios)

        return (
          <div key={item.id} className={`p-4 space-y-2.5 border-b border-birth-gray-2 transition-opacity ${row.activo ? '' : 'opacity-50'}`}>
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox" checked={row.activo}
                onChange={e => onChangeRow(item.id, { ...row, activo: e.target.checked })}
                className="accent-birth-black"
              />
              <span className="text-sm font-dm font-medium text-birth-black">{item.nombre}</span>
            </label>

            <div className="grid grid-cols-4 gap-2">
              <div>
                <label className="text-[10px] font-dm text-birth-gray-4 uppercase block mb-1">Planchas</label>
                <input
                  type="number" min="0" value={row.cantidad} disabled={!row.activo}
                  onChange={e => onChangeRow(item.id, { ...row, cantidad: e.target.value })}
                  className="w-full text-center border border-birth-gray-2 rounded px-1 py-1.5 text-sm font-dm focus:outline-none focus:border-birth-black disabled:bg-birth-gray"
                />
              </div>
              <div>
                <label className="text-[10px] font-dm text-birth-gray-4 uppercase block mb-1">Ancho mm</label>
                <input
                  type="number" min="0" value={row.anchoMm} disabled={!row.activo}
                  onChange={e => onChangeRow(item.id, { ...row, anchoMm: e.target.value })}
                  className="w-full text-center border border-birth-gray-2 rounded px-1 py-1.5 text-sm font-dm focus:outline-none focus:border-birth-black disabled:bg-birth-gray"
                />
              </div>
              <div>
                <label className="text-[10px] font-dm text-birth-gray-4 uppercase block mb-1">Alto mm</label>
                <input
                  type="number" min="0" value={row.altoMm} disabled={!row.activo}
                  onChange={e => onChangeRow(item.id, { ...row, altoMm: e.target.value })}
                  className="w-full text-center border border-birth-gray-2 rounded px-1 py-1.5 text-sm font-dm focus:outline-none focus:border-birth-black disabled:bg-birth-gray"
                />
              </div>
              <div>
                <label className="text-[10px] font-dm text-birth-gray-4 uppercase block mb-1">Precio/plancha</label>
                <input
                  type="number" min="0" value={precio ?? ''} disabled={!row.activo}
                  onChange={e => onPrecioChange(item.id, e.target.value)}
                  onBlur={onPrecioBlur}
                  className="w-full text-center border border-birth-gray-2 rounded px-1 py-1.5 text-sm font-dm focus:outline-none focus:border-birth-black disabled:bg-birth-gray"
                />
              </div>
            </div>

            <div className="flex items-center justify-between text-xs font-dm text-birth-gray-3">
              <span>{m2Cubiertos > 0 ? `${m2Cubiertos.toFixed(2)} m² cubiertos` : '—'}</span>
              <span className="font-barlow font-bold text-sm text-birth-black">{subtotal > 0 ? clp(subtotal) : '—'}</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}
